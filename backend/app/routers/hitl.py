"""HITL router — resolve Human-in-the-Loop interrupts."""

import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from supabase import AsyncClient

from app.dependencies import get_current_user, get_supabase_client
from app.exceptions import HITLError, NotFoundError
from app.graph.runner import resume_pipeline
from app.models.schemas import (
    HITLLetterReview,
    HITLOfferSelection,
    PipelineRunResponse,
    PipelineStatus,
)
from app.tools.supabase_ops import get_pipeline_run, update_pipeline_run

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/{run_id}/select-offer", response_model=PipelineRunResponse)
async def select_offer(
    run_id: str,
    data: HITLOfferSelection,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> PipelineRunResponse:
    """Resolve HITL-1 — user selects an offer from the discovered list.

    Resumes the LangGraph graph with the selected offer dict.
    """
    run = await get_pipeline_run(supabase=supabase, run_id=run_id, user_id=user["id"])
    if not run:
        raise NotFoundError(f"Pipeline run {run_id} not found")

    if run.get("status") != PipelineStatus.WAITING_OFFER_SELECTION.value:
        raise HITLError(
            f"Run {run_id} is not waiting for offer selection "
            f"(current status: {run.get('status')})"
        )

    logger.info("HITL-1: User %s selected offer %s for run %s",
                user["id"], data.selected_offer_id, run_id)

    # Find the selected offer dict from the discovered_offers list
    discovered = run.get("discovered_offers") or []
    selected_offer = next(
        (o for o in discovered if o.get("id") == data.selected_offer_id),
        None,
    )
    if not selected_offer:
        # Fall back: use the ID itself if dict not found
        selected_offer = {"id": data.selected_offer_id}

    # Synchronously update the status so the frontend immediately resumes polling
    await update_pipeline_run(
        supabase=supabase,
        run_id=run_id,
        status=PipelineStatus.MATCHING.value,
        selected_offer=selected_offer,
    )
    run["status"] = PipelineStatus.MATCHING.value
    run["selected_offer"] = selected_offer

    # Resume the interrupted graph in the background
    asyncio.create_task(
        resume_pipeline(
            run_id=run_id,
            resume_value=selected_offer,
            supabase=supabase,
        )
    )

    return PipelineRunResponse(**run)


@router.post("/{run_id}/review-letter", response_model=PipelineRunResponse)
async def review_letter(
    run_id: str,
    data: HITLLetterReview,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> PipelineRunResponse:
    """Resolve HITL-2 — user reviews and optionally edits the letter.

    Resumes the LangGraph graph with the review data dict.
    """
    run = await get_pipeline_run(supabase=supabase, run_id=run_id, user_id=user["id"])
    if not run:
        raise NotFoundError(f"Pipeline run {run_id} not found")

    if run.get("status") != PipelineStatus.WAITING_LETTER_REVIEW.value:
        raise HITLError(
            f"Run {run_id} is not waiting for letter review "
            f"(current status: {run.get('status')})"
        )

    logger.info(
        "HITL-2: User %s reviewed letter for run %s (approved=%s)",
        user["id"], run_id, data.approved,
    )

    # Synchronously update status so frontend unfreezes immediately
    final_letter = data.edited_letter or run.get("draft_letter", "")
    await update_pipeline_run(
        supabase=supabase,
        run_id=run_id,
        status=PipelineStatus.COMPLETED.value,
        final_letter=final_letter,
    )
    run["status"] = PipelineStatus.COMPLETED.value
    run["final_letter"] = final_letter

    # Resume the interrupted graph with the edited letter and approval decision
    asyncio.create_task(
        resume_pipeline(
            run_id=run_id,
            resume_value={
                "edited_letter": data.edited_letter,
                "approved": data.approved,
            },
            supabase=supabase,
        )
    )

    return PipelineRunResponse(**run)

