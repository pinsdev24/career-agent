"""Graph runner — executes the LangGraph pipeline and syncs state to Supabase.

Architecture (MVP):
- `get_checkpointer()` provides AsyncPostgresSaver using a connection pool.
  This is the correct pattern for a long-lived FastAPI process.
- `compile_graph_with_checkpointer()` creates a graph with persistent checkpoints.
- `run_pipeline()` is called as an asyncio background task.
  It streams graph events and writes status + data to Supabase after each node.
- `resume_pipeline()` resumes a paused (interrupted) graph with Command(resume=...).
- `cancel_pipeline()` cancels a running task and marks the run as failed.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command
from supabase import AsyncClient

from app.config import get_settings
from app.graph.builder import compile_graph
from app.tools.supabase_ops import update_pipeline_run

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Module-level singletons
# ──────────────────────────────────────────────

_checkpointer = None
_compiled_graph = None

# run_id → asyncio.Task  (only active/running tasks)
_running_tasks: dict[str, asyncio.Task] = {}


async def get_checkpointer():
    """Get or create the production checkpointer.

    AsyncPostgresSaver requires a connection pool for use in a long-lived
    server process. We use AsyncConnectionPool from psycopg_pool which keeps
    connections alive and handles reconnections automatically.

    Falls back to MemorySaver if Postgres is unavailable (dev/CI).
    """
    global _checkpointer
    if _checkpointer is not None:
        return _checkpointer

    settings = get_settings()

    try:
        from psycopg_pool import AsyncConnectionPool
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        # Open a persistent connection pool — this must stay alive for the
        # lifetime of the process (never call pool.close() except on shutdown).
        pool = AsyncConnectionPool(
            conninfo=settings.supabase_db_url,
            min_size=1,
            max_size=5,
            open=False,          # We open manually below
            kwargs={"autocommit": True, "prepare_threshold": None},
        )
        await pool.open()

        _checkpointer = AsyncPostgresSaver(pool)
        await _checkpointer.setup()  # Creates checkpoint tables if not yet present
        logger.info("Checkpointer: ✅ using AsyncPostgresSaver with connection pool")
        return _checkpointer

    except Exception as exc:
        logger.warning(
            "Checkpointer: AsyncPostgresSaver failed (%s: %s), "
            "falling back to MemorySaver",
            type(exc).__name__,
            exc,
        )
        _checkpointer = MemorySaver()
        logger.info("Checkpointer: using MemorySaver (development fallback)")
        return _checkpointer


async def get_compiled_graph():
    """Get or create the compiled graph with a persistent checkpointer."""
    global _compiled_graph
    if _compiled_graph is None:
        checkpointer = await get_checkpointer()
        _compiled_graph = compile_graph(checkpointer=checkpointer)
    return _compiled_graph


# ──────────────────────────────────────────────
# DB field mappings from state keys
# ──────────────────────────────────────────────

_STATE_TO_DB: dict[str, str] = {
    "status": "status",
    "discovered_offers": "discovered_offers",
    "selected_offer": "selected_offer",
    "gap_report": "gap_report",
    "draft_letter": "draft_letter",
    "final_letter": "final_letter",
    "revision_count": "revision_count",
    # Best-of-N tracking
    "best_draft": "best_draft",
    "best_score": "best_score",
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

from app.graph.pubsub import log_emitter  # noqa: E402


async def _run_graph(
    run_id: str,
    initial_state: dict,
    supabase: AsyncClient,
    resume_command: Command | None = None,
) -> None:
    """Stream graph execution and sync state to Supabase after every node."""
    graph = await get_compiled_graph()
    config = {"configurable": {"thread_id": run_id}}

    try:
        await log_emitter.emit(run_id, {"type": "info", "message": "Pipeline initialized."})

        if resume_command is not None:
            stream = graph.astream(
                resume_command, config=config, stream_mode=["updates", "messages"]
            )
        else:
            stream = graph.astream(
                initial_state, config=config, stream_mode=["updates", "messages"]
            )

        logger.info("run=%s | starting astream loop", run_id)
        async for event in stream:
            event_type = event[0]
            event_data = event[1]

            if event_type == "messages":
                messages = event_data[0]
                for msg in messages:
                    if hasattr(msg, "tool_calls") and msg.tool_calls:
                        for call in msg.tool_calls:
                            await log_emitter.emit(run_id, {
                                "type": "agent_action",
                                "message": f"Agent is calling tool: {call['name']}",
                            })

            elif event_type == "updates":
                state_update = event_data
                logger.info(
                    "run=%s | state_update keys: %s",
                    run_id,
                    list(state_update.keys()),
                )

                for node_name, node_output in state_update.items():
                    await log_emitter.emit(run_id, {
                        "type": "node_finish",
                        "node": node_name,
                        "message": f"Completed step: {node_name.replace('_', ' ').title()}",
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
                            await update_pipeline_run(
                                supabase=supabase, run_id=run_id, **db_updates
                            )
                        except Exception as exc:
                            logger.warning("run=%s | DB update failed: %s", run_id, exc)

        logger.info("run=%s | astream loop finished", run_id)
        await log_emitter.emit(run_id, {
            "type": "info",
            "message": "Pipeline execution completed or paused for review.",
        })

    except asyncio.CancelledError:
        logger.info("run=%s | task cancelled", run_id)
        await log_emitter.emit(run_id, {"type": "error", "message": "Pipeline was cancelled."})
        try:
            await update_pipeline_run(supabase=supabase, run_id=run_id, status="failed")
        except Exception:
            pass
        raise

    except Exception as exc:
        logger.error("run=%s | graph execution failed: %s", run_id, exc, exc_info=True)
        await log_emitter.emit(run_id, {
            "type": "error",
            "message": f"Pipeline failed: {str(exc)}",
        })
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
    """Build initial graph state from the DB profile and launch the pipeline."""
    from app.tools.supabase_ops import get_profile

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
            # Initialize Best-of-N tracking
            "draft_history": [],
            "best_draft": "",
            "best_score": 0,
            # Memory populated by memory_loader node
            "user_preferences": {},
        }

        logger.info("run=%s | starting graph (mode=%s)", run_id, entry_mode)
        await _run_graph(run_id=run_id, initial_state=initial_state, supabase=supabase)

    finally:
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
        await _run_graph(
            run_id=run_id, initial_state={}, supabase=supabase, resume_command=command
        )
    finally:
        _running_tasks.pop(run_id, None)


async def cancel_pipeline(run_id: str, supabase: AsyncClient) -> bool:
    """Cancel a running pipeline task.

    Returns True if a live task was found and cancelled.
    For paused/interrupted runs, directly marks as failed in DB.
    """
    task = _running_tasks.get(run_id)

    if task and not task.done():
        logger.info("run=%s | cancelling active task", run_id)
        task.cancel()
        return True

    logger.info("run=%s | no active task, marking failed directly", run_id)
    try:
        await update_pipeline_run(supabase=supabase, run_id=run_id, status="failed")
    except Exception as exc:
        logger.warning("run=%s | failed to mark as failed: %s", run_id, exc)
    return False
