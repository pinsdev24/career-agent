"""ARQ job implementations."""

from __future__ import annotations

import logging
from typing import Any

from supabase import AsyncClient

from app.db.applications import (
    close_work_items,
    insert_packet,
    latest_packet,
    open_work_item,
    posting_to_selected_offer,
    update_application,
    update_packet,
)
from app.graph.pubsub import log_emitter
from app.graph.runner import resume_pipeline, run_pipeline
from app.tools.supabase_ops import get_profile
from app.workers.packet import run_packet_graph

logger = logging.getLogger(__name__)


async def generate_packet_job(
    ctx: dict,
    application_id: str,
    user_id: str,
    posting: dict,
    user_feedback: str | None = None,
) -> dict:
    """Generate (or rewrite) an application packet for a catalog posting."""
    supabase: AsyncClient = ctx["supabase"]
    await log_emitter.emit(
        application_id,
        {"type": "info", "message": "Packet worker started."},
    )

    try:
        profile = await get_profile(supabase=supabase, user_id=user_id)
    except Exception as exc:
        logger.error("packet job: profile load failed app=%s: %s", application_id, exc)
        await update_application(
            supabase,
            application_id,
            status="draft",
            error_details={"error": "profile_unavailable", "detail": str(exc)},
        )
        return {"ok": False, "error": "profile_unavailable"}

    selected_offer = posting_to_selected_offer(posting)
    existing = await latest_packet(supabase, application_id)

    initial_state: dict[str, Any] = {
        "run_id": application_id,
        "user_id": user_id,
        "entry_mode": "url",
        "offer_url": selected_offer.get("url"),
        "cv_text": profile.get("cv_raw_text", ""),
        "cv_structured": profile.get("cv_structured", {}),
        "search_preferences": profile.get("search_preferences", {}),
        "tone_of_voice": profile.get("tone_of_voice", "professional"),
        "language_preference": profile.get("language_preference", "en"),
        "selected_offer": selected_offer,
        "status": "matching",
        "draft_history": [],
        "best_draft": existing.get("best_draft", "") if existing else "",
        "best_score": existing.get("best_score", 0) if existing else 0,
        "revision_count": existing.get("revision_count", 0) if existing else 0,
        "draft_letter": existing.get("draft_letter", "") if existing else "",
        "user_feedback": user_feedback,
        "user_preferences": {},
    }

    try:
        final_state = await run_packet_graph(initial_state)
    except Exception as exc:
        logger.error("packet graph failed app=%s: %s", application_id, exc, exc_info=True)
        await update_application(
            supabase,
            application_id,
            status="draft",
            error_details={"error": "packet_failed", "detail": str(exc)},
        )
        await log_emitter.emit(
            application_id,
            {"type": "error", "message": f"Packet generation failed: {exc}"},
        )
        return {"ok": False, "error": str(exc)}

    packet_fields = {
        "gap_report": final_state.get("gap_report"),
        "draft_letter": final_state.get("best_draft") or final_state.get("draft_letter"),
        "critic_score": final_state.get("best_feedback") or final_state.get("critic_feedback"),
        "best_draft": final_state.get("best_draft") or final_state.get("draft_letter"),
        "best_score": final_state.get("best_score") or final_state.get("critic_score") or 0,
        "revision_count": final_state.get("revision_count", 0),
        "user_feedback": user_feedback,
        "model_meta": {"source": "packet_graph"},
    }

    if existing:
        await update_packet(supabase, existing["id"], **packet_fields)
    else:
        await insert_packet(supabase, application_id, **packet_fields)

    await update_application(supabase, application_id, status="packet_ready", error_details=None)
    await close_work_items(supabase, application_id, "review_packet")
    await open_work_item(
        supabase,
        user_id=user_id,
        application_id=application_id,
        item_type="review_packet",
        payload={
            "title": selected_offer.get("title"),
            "company": selected_offer.get("company"),
            "apply_url": selected_offer.get("url"),
        },
    )
    await log_emitter.emit(
        application_id,
        {"type": "info", "message": "Packet ready for review."},
    )
    return {"ok": True, "application_id": application_id}


async def run_pipeline_job(
    ctx: dict,
    run_id: str,
    user_id: str,
    entry_mode: str,
    offer_url: str | None,
) -> None:
    await run_pipeline(
        run_id=run_id,
        user_id=user_id,
        entry_mode=entry_mode,
        offer_url=offer_url,
        supabase=ctx["supabase"],
    )


async def resume_pipeline_job(ctx: dict, run_id: str, resume_value: object) -> None:
    await resume_pipeline(
        run_id=run_id,
        resume_value=resume_value,
        supabase=ctx["supabase"],
    )
