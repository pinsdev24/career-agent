"""Applications and HITL inbox — product state lives here, not in LangGraph."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from supabase import AsyncClient

from app.db.applications import (
    close_work_items,
    get_application,
    get_application_by_posting,
    get_job_posting,
    latest_packet,
    list_applications,
    list_open_work_items,
    open_work_item,
    update_application,
    update_packet,
    upsert_application,
)
from app.dependencies import get_current_user, get_supabase_client
from app.exceptions import HITLError, NotFoundError
from app.rate_limit import rate_limit_pipeline_start
from app.tools.supabase_ops import get_profile
from app.workers import enqueue_job

router = APIRouter()
logger = logging.getLogger(__name__)


class ApplicationCreateRequest(BaseModel):
    posting_id: str


class ApplicationReviewRequest(BaseModel):
    edited_letter: str | None = None
    approved: bool = True
    user_feedback: str | None = None


class ApplicationStatusUpdate(BaseModel):
    status: Literal["submitted", "interviewing", "rejected", "withdrawn"]


class ApplicationResponse(BaseModel):
    id: str
    user_id: str
    posting_id: str
    status: str
    pipeline_run_id: str | None = None
    error_details: dict[str, Any] | None = None
    submitted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    packet: dict[str, Any] | None = None
    posting: dict[str, Any] | None = None


class WorkItemResponse(BaseModel):
    id: str
    user_id: str
    application_id: str | None = None
    item_type: str
    status: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None


def _row_to_application(
    row: dict,
    *,
    packet: dict | None = None,
    posting: dict | None = None,
) -> ApplicationResponse:
    return ApplicationResponse(
        id=row["id"],
        user_id=row["user_id"],
        posting_id=row["posting_id"],
        status=row["status"],
        pipeline_run_id=row.get("pipeline_run_id"),
        error_details=row.get("error_details"),
        submitted_at=row.get("submitted_at"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
        packet=packet,
        posting=posting,
    )


@router.post("", response_model=ApplicationResponse)
async def create_application(
    data: ApplicationCreateRequest,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
    _rate_limit: Annotated[None, Depends(rate_limit_pipeline_start)],
) -> ApplicationResponse:
    """Start a packet for a catalog posting. Idempotent per user+posting."""
    profile = await get_profile(supabase=supabase, user_id=user["id"])
    if not (profile.get("cv_raw_text") or "").strip():
        raise HITLError("Upload a CV before requesting an application packet")

    posting = await get_job_posting(supabase, data.posting_id)
    if not posting:
        raise NotFoundError("Job posting not found")
    if posting.get("status") and posting["status"] != "active":
        raise HITLError("This job is no longer active")

    existing = await get_application_by_posting(supabase, user["id"], data.posting_id)
    if existing and existing["status"] in {"generating", "packet_ready", "approved", "submitted"}:
        packet = await latest_packet(supabase, existing["id"])
        return _row_to_application(existing, packet=packet, posting=posting)

    row = await upsert_application(
        supabase,
        user_id=user["id"],
        posting_id=data.posting_id,
        status="generating",
        application_id=existing["id"] if existing else None,
    )
    await enqueue_job(
        "generate_packet_job",
        row["id"],
        user["id"],
        posting,
        None,
        _job_id=f"packet:{row['id']}",
    )
    logger.info("enqueued packet for application=%s user=%s", row["id"], user["id"])
    return _row_to_application(row, posting=posting)


@router.get("", response_model=list[ApplicationResponse])
async def list_user_applications(
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> list[ApplicationResponse]:
    rows = await list_applications(supabase, user["id"])
    results: list[ApplicationResponse] = []
    for row in rows:
        packet = await latest_packet(supabase, row["id"])
        posting = await get_job_posting(supabase, row["posting_id"])
        results.append(_row_to_application(row, packet=packet, posting=posting))
    return results


@router.get("/inbox", response_model=list[WorkItemResponse])
async def list_inbox(
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> list[WorkItemResponse]:
    items = await list_open_work_items(supabase, user["id"])
    return [WorkItemResponse(**item) for item in items]


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application_detail(
    application_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> ApplicationResponse:
    row = await get_application(supabase, application_id, user["id"])
    if not row:
        raise NotFoundError("Application not found")
    packet = await latest_packet(supabase, row["id"])
    posting = await get_job_posting(supabase, row["posting_id"])
    return _row_to_application(row, packet=packet, posting=posting)


@router.post("/{application_id}/review", response_model=ApplicationResponse)
async def review_application_packet(
    application_id: str,
    data: ApplicationReviewRequest,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> ApplicationResponse:
    row = await get_application(supabase, application_id, user["id"])
    if not row:
        raise NotFoundError("Application not found")
    if row["status"] != "packet_ready":
        raise HITLError(f"Application is not waiting for review (status={row['status']})")

    packet = await latest_packet(supabase, application_id)
    if not packet:
        raise HITLError("No packet to review")

    letter = data.edited_letter or packet.get("best_draft") or packet.get("draft_letter") or ""

    if data.approved:
        await update_packet(supabase, packet["id"], final_letter=letter)
        updated = await update_application(supabase, application_id, status="approved")
        await close_work_items(supabase, application_id, "review_packet")
        await open_work_item(
            supabase,
            user_id=user["id"],
            application_id=application_id,
            item_type="confirm_submitted",
            payload={"apply_url": (await get_job_posting(supabase, row["posting_id"]) or {}).get("apply_url")},
        )
        posting = await get_job_posting(supabase, row["posting_id"])
        packet = await latest_packet(supabase, application_id)
        return _row_to_application(updated, packet=packet, posting=posting)

    posting = await get_job_posting(supabase, row["posting_id"])
    if not posting:
        raise NotFoundError("Job posting not found")
    await update_packet(supabase, packet["id"], draft_letter=letter, user_feedback=data.user_feedback)
    updated = await update_application(supabase, application_id, status="generating")
    await close_work_items(supabase, application_id, "review_packet")
    await enqueue_job(
        "generate_packet_job",
        application_id,
        user["id"],
        posting,
        data.user_feedback,
        _job_id=f"packet-rewrite:{application_id}:{packet.get('revision_count', 0)}",
    )
    return _row_to_application(updated, packet=packet, posting=posting)


@router.post("/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: str,
    data: ApplicationStatusUpdate,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> ApplicationResponse:
    row = await get_application(supabase, application_id, user["id"])
    if not row:
        raise NotFoundError("Application not found")

    updates: dict[str, Any] = {"status": data.status}
    if data.status == "submitted":
        updates["submitted_at"] = datetime.now(timezone.utc).isoformat()
        await close_work_items(supabase, application_id, "confirm_submitted")

    updated = await update_application(supabase, application_id, **updates)
    packet = await latest_packet(supabase, application_id)
    posting = await get_job_posting(supabase, row["posting_id"])
    return _row_to_application(updated, packet=packet, posting=posting)
