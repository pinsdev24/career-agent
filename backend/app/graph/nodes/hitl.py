"""HITL nodes — Human-in-the-Loop interrupt points.

Uses LangGraph interrupt() to pause the graph and wait for user input.
The checkpointer persists the full state between pause and resume.

Status update strategy:
  - Each HITL node calls `_set_status()` to write the waiting status to Supabase
    BEFORE calling interrupt(), so the frontend poll sees the updated status.
  - After interrupt() resumes, the node returns the next status in state.
"""

import logging

from langchain_core.runnables import RunnableConfig
from langgraph.types import interrupt

from app.models.state import AgentState

logger = logging.getLogger(__name__)


async def _set_status(run_id: str, status: str, extra: dict | None = None) -> None:
    """Write status (and optional fields) directly to Supabase.

    This is a direct DB write so the frontend poll sees the status update
    before the interrupt() call suspends graph execution.
    """
    try:
        from app.dependencies import create_supabase_client
        from app.config import get_settings
        from app.tools.supabase_ops import update_pipeline_run

        settings = get_settings()
        supabase = await create_supabase_client(settings)
        updates = {"status": status, **(extra or {})}
        await update_pipeline_run(supabase=supabase, run_id=run_id, **updates)
        logger.info("HITL: status set to '%s' for run=%s", status, run_id)
    except Exception as exc:
        logger.warning("HITL: failed to set status '%s' for run=%s: %s", status, run_id, exc)


async def hitl1_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """HITL-1: Present discovered offers to user for selection.

    Writes `waiting_offer_selection` to DB before suspending so the frontend
    poll immediately reflects the updated status.
    """
    offers = state.get("discovered_offers", [])
    run_id = state.get("run_id", "")
    thread_id = config.get("configurable", {}).get("thread_id", "unknown")

    logger.info(
        "HITL-1: presenting %d offers (thread=%s, run=%s)",
        len(offers),
        thread_id,
        run_id,
    )

    # Write waiting status to DB before pausing
    # (discovered_offers was already synced by runner)
    await _set_status(
        run_id,
        "waiting_offer_selection",
    )
    from app.graph.pubsub import log_emitter
    await log_emitter.emit(run_id, {
        "type": "info",
        "message": "HITL: Searching paused. Waiting for your offer selection...",
    })

    # Bypass interrupt if running evaluation
    if config.get("configurable", {}).get("is_evaluation"):
        logger.info("HITL-1: Bypassing interrupt for evaluation mode")
        selected_offer = offers[0] if offers else {}
    else:
        # interrupt() suspends graph execution; resumes with user's selected offer dict
        selected_offer = interrupt({
            "type": "offer_selection",
            "offers": offers,
            "message": "Please select a job offer to analyze.",
        })

    logger.info("HITL-1: resumed with offer selection (thread=%s)", thread_id)

    return {
        "selected_offer": selected_offer,
        "status": "matching",
    }


async def hitl2_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """HITL-2: Present the BEST cover letter draft for user review and editing.

    Uses Best-of-N tracking: presents `best_draft` (highest scoring) rather than
    `draft_letter` (which may be a worse later revision).

    Writes `waiting_letter_review` + the best draft to DB before suspending.
    """
    thread_id = config.get("configurable", {}).get("thread_id", "unknown")
    run_id = state.get("run_id", "")

    # Best-of-N: use best_draft if available, fall back to draft_letter
    best_draft = state.get("best_draft") or state.get("draft_letter", "")
    best_score = state.get("best_score", state.get("critic_score", 0))
    current_score = state.get("critic_score", 0)
    revision_count = state.get("revision_count", 0)

    logger.info(
        "HITL-2: presenting best letter (best_score=%s, current_score=%s, "
        "revisions=%d, thread=%s)",
        best_score,
        current_score,
        revision_count,
        thread_id,
    )

    best_feedback = state.get("best_feedback") or state.get("critic_feedback", {})

    # Write waiting status + BEST draft to DB before pausing.
    # CRITICAL: The frontend polls pipeline_runs.draft_letter to display the letter.
    # Without this explicit write, the DB contains the LAST writer output (draft_letter),
    # not the best_draft — causing the user to see the worst revision.
    await _set_status(
        run_id,
        "waiting_letter_review",
        {
            "draft_letter": best_draft,   # Overwrite draft_letter with the BEST draft
            "best_draft": best_draft,
            "best_score": best_score,
            "critic_score": best_feedback, # Overwrite critic_score with BEST feedback
        },
    )
    from app.graph.pubsub import log_emitter

    # Inform user if we're showing a better earlier draft
    if best_score > current_score and best_draft != state.get("draft_letter", ""):
        await log_emitter.emit(run_id, {
            "type": "info",
            "message": (
                f"HITL: Presenting your BEST draft (scored {best_score}/100) — "
                f"the latest revision scored {current_score}/100, so we kept the better one."
            ),
        })
    else:
        await log_emitter.emit(run_id, {
            "type": "info",
            "message": "HITL: Draft letter ready. Waiting for your final review and approval...",
        })

    # Bypass interrupt if running evaluation
    if config.get("configurable", {}).get("is_evaluation"):
        logger.info("HITL-2: Bypassing interrupt for evaluation mode")
        review = {"edited_letter": best_draft}
    else:
        # interrupt() suspends execution; resumes with review dict
        review = interrupt({
            "type": "letter_review",
            "draft_letter": best_draft,  # Show the best draft, not the last
            "best_score": best_score,
            "critic_score": best_score,
            "critic_feedback": best_feedback,
            "gap_report": state.get("gap_report", {}),
            "revision_count": revision_count,
            "message": "Please review and optionally edit the cover letter.",
        })

    # review is the dict returned by Command(resume=review_data) from the API
    final_letter = review.get("edited_letter") or best_draft

    logger.info("HITL-2: letter approved (thread=%s)", thread_id)

    return {
        "final_letter": final_letter,
        "status": "completed",
    }
