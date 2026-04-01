"""Pipeline router — start runs and check status."""

import asyncio
import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, get_supabase_client
from app.exceptions import NotFoundError
from app.graph.runner import cancel_pipeline, run_pipeline
from app.models.schemas import (
    PipelineRunResponse,
    PipelineStartRequest,
    PipelineStatus,
    PipelineStatusResponse,
)
from app.tools.supabase_ops import create_pipeline_run, get_pipeline_run, get_user_runs
from supabase import AsyncClient

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/start", response_model=PipelineStatusResponse)
async def start_pipeline(
    data: PipelineStartRequest,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> PipelineStatusResponse:
    """Start a new pipeline run.

    Creates a pipeline_runs row then kicks off the LangGraph graph as a
    non-blocking background task so the HTTP response returns immediately.
    """
    run_id = str(uuid.uuid4())

    logger.info(
        "Starting pipeline run %s for user %s (mode=%s)",
        run_id,
        user["id"],
        data.entry_mode.value,
    )

    # Create the run record first so the frontend can poll immediately
    await create_pipeline_run(
        supabase=supabase,
        run_id=run_id,
        user_id=user["id"],
        entry_mode=data.entry_mode.value,
        offer_url=str(data.offer_url) if data.offer_url else None,
    )

    # Launch the graph in the background (non-blocking)
    asyncio.create_task(
        run_pipeline(
            run_id=run_id,
            user_id=user["id"],
            entry_mode=data.entry_mode.value,
            offer_url=str(data.offer_url) if data.offer_url else None,
            supabase=supabase,
        )
    )

    logger.info("Pipeline run %s created and graph task launched", run_id)

    return PipelineStatusResponse(
        id=run_id,
        status=PipelineStatus.STARTED,
        revision_count=0,
    )


@router.get("/runs", response_model=list[PipelineRunResponse])
async def list_runs(
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> list[PipelineRunResponse]:
    """List all pipeline runs for the current user."""
    runs = await get_user_runs(supabase=supabase, user_id=user["id"])
    return [PipelineRunResponse(**run) for run in runs]


@router.get("/{run_id}", response_model=PipelineRunResponse)
async def get_run_status(
    run_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> PipelineRunResponse:
    """Get the current state of a pipeline run."""
    run = await get_pipeline_run(
        supabase=supabase,
        run_id=run_id,
        user_id=user["id"],
    )
    if not run:
        raise NotFoundError(f"Pipeline run {run_id} not found")

    return PipelineRunResponse(**run)


@router.post("/{run_id}/cancel")
async def cancel_pipeline_run(
    run_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> dict[str, str | bool]:
    """Cancel a running pipeline."""
    # Ensure they own the run
    run = await get_pipeline_run(supabase=supabase, run_id=run_id, user_id=user["id"])
    if not run:
        raise NotFoundError(f"Pipeline run {run_id} not found")

    cancelled = await cancel_pipeline(run_id=run_id, supabase=supabase)
    return {"status": "success", "cancelled": cancelled}


from fastapi.responses import StreamingResponse

from app.graph.pubsub import log_emitter


@router.get("/{run_id}/stream")
async def stream_pipeline_logs(
    run_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
):
    """Server-Sent Events endpoint to stream real-time execution logs."""
    # Ensure they own the run
    run = await get_pipeline_run(supabase=supabase, run_id=run_id, user_id=user["id"])
    if not run:
        raise NotFoundError(f"Pipeline run {run_id} not found")

    return StreamingResponse(log_emitter.stream(run_id), media_type="text/event-stream")
