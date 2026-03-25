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
    """HITL-2: Present the cover letter draft for user review and editing.

    Writes `waiting_letter_review` + the draft letter to DB before suspending.
    """
    thread_id = config.get("configurable", {}).get("thread_id", "unknown")
    run_id = state.get("run_id", "")

    logger.info(
        "HITL-2: presenting letter for review (score=%s, revisions=%d, thread=%s)",
        state.get("critic_score"),
        state.get("revision_count", 0),
        thread_id,
    )

    # Write waiting status to DB before pausing
    # (other attributes like draft_letter and critic_feedback were already synced by runner)
    await _set_status(
        run_id,
        "waiting_letter_review",
    )

    # interrupt() suspends execution; resumes with review dict
    review = interrupt({
        "type": "letter_review",
        "draft_letter": state.get("draft_letter", ""),
        "critic_score": state.get("critic_score", 0),
        "critic_feedback": state.get("critic_feedback", {}),
        "gap_report": state.get("gap_report", {}),
        "message": "Please review and optionally edit the cover letter.",
    })

    # review is the dict returned by Command(resume=review_data) from the API
    final_letter = review.get("edited_letter") or state.get("draft_letter", "")

    logger.info("HITL-2: letter approved (thread=%s)", thread_id)

    return {
        "final_letter": final_letter,
        "status": "completed",
    }
