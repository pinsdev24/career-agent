"""Graph runner — executes the LangGraph pipeline and syncs state to Supabase.

Architecture:
- `compile_graph_with_memory()` creates a graph with MemorySaver (PoC checkpointer).
- `run_pipeline()` is called as an asyncio background task.
  It streams graph events and writes status + data to Supabase after each node.
- `resume_pipeline()` resumes a paused (interrupted) graph with Command(resume=...).
- `cancel_pipeline()` cancels a running task and marks the run as failed.
"""

import asyncio
import logging

from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command
from supabase import AsyncClient

from app.graph.builder import compile_graph
from app.tools.supabase_ops import update_pipeline_run

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Module-level singletons
# ──────────────────────────────────────────────

_memory_saver: MemorySaver | None = None
_compiled_graph = None

# run_id → asyncio.Task  (only active/running tasks)
_running_tasks: dict[str, asyncio.Task] = {}


def get_memory_saver() -> MemorySaver:
    global _memory_saver
    if _memory_saver is None:
        _memory_saver = MemorySaver()
    return _memory_saver


def get_compiled_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = compile_graph(checkpointer=get_memory_saver())
    return _compiled_graph


# ──────────────────────────────────────────────
# DB field mappings from state keys
# ──────────────────────────────────────────────

# Which state keys map to pipeline_runs columns.
# critic_feedback (full dict) → critic_score column (CriticScore-shaped dict).
# critic_score (bare int) is intentionally excluded — it lives inside critic_feedback.
_STATE_TO_DB: dict[str, str] = {
    "status": "status",
    "discovered_offers": "discovered_offers",
    "selected_offer": "selected_offer",
    "gap_report": "gap_report",
    "draft_letter": "draft_letter",
    "final_letter": "final_letter",
    "revision_count": "revision_count",
}


def _extract_db_updates(state: dict) -> dict:
    """Extract fields from graph state that should be written to pipeline_runs."""
    updates: dict = {}
    for state_key, db_col in _STATE_TO_DB.items():
        if state_key in state:
            updates[db_col] = state[state_key]

    # Map critic_feedback (full CriticEvaluation dict) → critic_score DB column.
    if "critic_feedback" in state and state["critic_feedback"]:
        updates["critic_score"] = state["critic_feedback"]

    return updates


# ──────────────────────────────────────────────
# Internal graph execution
# ──────────────────────────────────────────────


from app.graph.pubsub import log_emitter

async def _run_graph(
    run_id: str,
    initial_state: dict,
    supabase: AsyncClient,
    resume_command: Command | None = None,
) -> None:
    """Stream graph execution and sync state to Supabase after every node."""
    graph = get_compiled_graph()
    config = {"configurable": {"thread_id": run_id}}

    try:
        await log_emitter.emit(run_id, {"type": "info", "message": "Pipeline initialized."})
        
        if resume_command is not None:
            stream = graph.astream(resume_command, config=config, stream_mode=["updates", "messages"])
        else:
            stream = graph.astream(initial_state, config=config, stream_mode=["updates", "messages"])

        logger.info("run=%s | starting astream loop", run_id)
        async for event in stream:
            event_type = event[0]
            event_data = event[1]
            
            if event_type == "messages":
                # event_data is a tuple of (messages, dict)
                messages = event_data[0]
                for msg in messages:
                    if hasattr(msg, "tool_calls") and msg.tool_calls:
                        for call in msg.tool_calls:
                            await log_emitter.emit(run_id, {
                                "type": "agent_action",
                                "message": f"Agent is calling tool: {call['name']}"
                            })
                    elif getattr(msg, "type", "") == "ai" and msg.content and not hasattr(msg, "tool_calls"):
                        # Only emit if it's an actual direct text response going somewhere, though usually we wait for node finishes
                        pass

            elif event_type == "updates":
                state_update = event_data
                logger.info("run=%s | Received state_update keys: %s", run_id, list(state_update.keys()))
                
                # We use stream_mode="updates", so state_update is {"node_name": {"key": "val", ...}}
                # Skip "__start__" internal LangGraph events
                for node_name, node_output in state_update.items():
                    await log_emitter.emit(run_id, {
                        "type": "node_finish",
                        "node": node_name,
                        "message": f"Completed step: {node_name.replace('_', ' ').title()}"
                    })
                    
                    if not isinstance(node_output, dict):
                        continue
                        
                    db_updates = _extract_db_updates(node_output)
                    if db_updates:
                        logger.debug(
                            "run=%s | writing to DB (from %s): %s",
                            run_id,
                            node_name,
                            {k: str(v)[:60] for k, v in db_updates.items()},
                        )
                        try:
                            await update_pipeline_run(supabase=supabase, run_id=run_id, **db_updates)
                        except Exception as exc:
                            logger.warning("run=%s | DB update failed: %s", run_id, exc)

        logger.info("run=%s | astream loop finished normally", run_id)
        await log_emitter.emit(run_id, {"type": "info", "message": "Pipeline execution completed or paused."})

    except asyncio.CancelledError:
        # Task was cancelled via cancel_pipeline() — mark as failed in DB
        logger.info("run=%s | task cancelled by user", run_id)
        await log_emitter.emit(run_id, {"type": "error", "message": "Pipeline was cancelled."})
        try:
            await update_pipeline_run(supabase=supabase, run_id=run_id, status="failed")
        except Exception:
            pass
        raise  # re-raise so asyncio properly cleans up the task

    except Exception as exc:
        logger.error("run=%s | graph execution failed: %s", run_id, exc, exc_info=True)
        await log_emitter.emit(run_id, {"type": "error", "message": f"Pipeline failed: {str(exc)}"})
        try:
            await update_pipeline_run(supabase=supabase, run_id=run_id, status="failed")
        except Exception:
            pass


# ──────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────


async def run_pipeline(
    run_id: str,
    user_id: str,
    entry_mode: str,
    offer_url: str | None,
    supabase: AsyncClient,
) -> None:
    """Build initial graph state from the DB profile and launch the pipeline.

    Registers the current asyncio task in _running_tasks so it can be cancelled.
    """
    from app.tools.supabase_ops import get_profile

    # Register this task so cancel_pipeline() can reach it
    task = asyncio.current_task()
    if task:
        _running_tasks[run_id] = task

    try:
        logger.info("run=%s | fetching profile for user=%s", run_id, user_id)
        try:
            profile = await get_profile(supabase=supabase, user_id=user_id)
        except Exception as exc:
            logger.error("run=%s | failed to load profile: %s", run_id, exc)
            await update_pipeline_run(supabase=supabase, run_id=run_id, status="failed")
            return

        initial_state: dict = {
            "run_id": run_id,
            "user_id": user_id,
            "entry_mode": entry_mode,
            "offer_url": offer_url,
            "cv_text": profile.get("cv_raw_text", ""),
            "cv_structured": profile.get("cv_structured", {}),
            "search_preferences": profile.get("search_preferences", {}),
            "tone_of_voice": profile.get("tone_of_voice", "professional"),
            "status": "started",
        }

        logger.info("run=%s | starting graph (mode=%s)", run_id, entry_mode)
        await _run_graph(run_id=run_id, initial_state=initial_state, supabase=supabase)
        logger.info("run=%s | graph complete (or interrupted)", run_id)

    finally:
        # Always deregister, whether completed, failed, or cancelled
        _running_tasks.pop(run_id, None)


async def resume_pipeline(
    run_id: str,
    resume_value: object,
    supabase: AsyncClient,
) -> None:
    """Resume a previously interrupted pipeline with a user-provided value."""
    task = asyncio.current_task()
    if task:
        _running_tasks[run_id] = task

    try:
        logger.info("run=%s | resuming graph", run_id)
        command = Command(resume=resume_value)
        await _run_graph(run_id=run_id, initial_state={}, supabase=supabase, resume_command=command)
        logger.info("run=%s | graph resumed and completed (or re-interrupted)", run_id)
    finally:
        _running_tasks.pop(run_id, None)


async def cancel_pipeline(run_id: str, supabase: AsyncClient) -> bool:
    """Cancel a running pipeline task.

    Returns True if a task was found and cancelled, False if no running task exists.
    For interrupted (waiting) runs that have no live task, directly marks as failed.
    """
    task = _running_tasks.get(run_id)

    if task and not task.done():
        logger.info("run=%s | cancelling active task", run_id)
        task.cancel()
        return True

    # No live task (e.g. run is paused at HITL interrupt) — just update DB directly
    logger.info("run=%s | no active task found, setting status=failed directly", run_id)
    try:
        await update_pipeline_run(supabase=supabase, run_id=run_id, status="failed")
    except Exception as exc:
        logger.warning("run=%s | failed to update status on cancel: %s", run_id, exc)
    return False
