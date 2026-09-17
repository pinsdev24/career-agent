"""Application / packet / inbox persistence."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from supabase import AsyncClient

from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)


async def get_job_posting(supabase: AsyncClient, posting_id: str) -> dict | None:
    result = (
        await supabase.table("job_postings")
        .select("*")
        .eq("id", posting_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def get_application(
    supabase: AsyncClient, application_id: str, user_id: str
) -> dict | None:
    result = (
        await supabase.table("applications")
        .select("*")
        .eq("id", application_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def get_application_by_posting(
    supabase: AsyncClient, user_id: str, posting_id: str
) -> dict | None:
    result = (
        await supabase.table("applications")
        .select("*")
        .eq("user_id", user_id)
        .eq("posting_id", posting_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def list_applications(supabase: AsyncClient, user_id: str) -> list[dict]:
    result = (
        await supabase.table("applications")
        .select("*")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data or []


async def upsert_application(
    supabase: AsyncClient,
    *,
    user_id: str,
    posting_id: str,
    status: str,
    application_id: str | None = None,
) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    row: dict[str, Any] = {
        "user_id": user_id,
        "posting_id": posting_id,
        "status": status,
        "updated_at": now,
    }
    if application_id:
        row["id"] = application_id
    result = (
        await supabase.table("applications")
        .upsert(row, on_conflict="user_id,posting_id")
        .execute()
    )
    if not result.data:
        raise NotFoundError("Failed to upsert application")
    return result.data[0]


async def update_application(
    supabase: AsyncClient, application_id: str, **updates: Any
) -> dict:
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = (
        await supabase.table("applications")
        .update(updates)
        .eq("id", application_id)
        .execute()
    )
    if not result.data:
        raise NotFoundError(f"Application {application_id} not found")
    return result.data[0]


async def insert_packet(
    supabase: AsyncClient, application_id: str, **fields: Any
) -> dict:
    payload = {
        "application_id": application_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **fields,
    }
    result = await supabase.table("application_packets").insert(payload).execute()
    if not result.data:
        raise NotFoundError("Failed to insert application packet")
    return result.data[0]


async def latest_packet(supabase: AsyncClient, application_id: str) -> dict | None:
    result = (
        await supabase.table("application_packets")
        .select("*")
        .eq("application_id", application_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def update_packet(supabase: AsyncClient, packet_id: str, **updates: Any) -> dict:
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = (
        await supabase.table("application_packets")
        .update(updates)
        .eq("id", packet_id)
        .execute()
    )
    if not result.data:
        raise NotFoundError(f"Packet {packet_id} not found")
    return result.data[0]


async def open_work_item(
    supabase: AsyncClient,
    *,
    user_id: str,
    application_id: str,
    item_type: str,
    payload: dict | None = None,
) -> dict:
    result = (
        await supabase.table("work_items")
        .insert(
            {
                "user_id": user_id,
                "application_id": application_id,
                "item_type": item_type,
                "status": "open",
                "payload": payload or {},
            }
        )
        .execute()
    )
    if not result.data:
        raise NotFoundError("Failed to create work item")
    return result.data[0]


async def list_open_work_items(supabase: AsyncClient, user_id: str) -> list[dict]:
    result = (
        await supabase.table("work_items")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "open")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


async def close_work_items(
    supabase: AsyncClient, application_id: str, item_type: str
) -> None:
    await (
        supabase.table("work_items")
        .update(
            {
                "status": "done",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("application_id", application_id)
        .eq("item_type", item_type)
        .eq("status", "open")
        .execute()
    )


async def insert_cv_version(
    supabase: AsyncClient,
    *,
    user_id: str,
    raw_text: str,
    structured: dict,
    storage_path: str | None,
) -> dict:
    result = (
        await supabase.table("cv_versions")
        .insert(
            {
                "user_id": user_id,
                "raw_text": raw_text,
                "structured": structured,
                "storage_path": storage_path,
            }
        )
        .execute()
    )
    if not result.data:
        raise NotFoundError("Failed to insert CV version")
    return result.data[0]


def posting_to_selected_offer(posting: dict) -> dict:
    """Map a catalog row onto the graph's selected_offer shape."""
    description = posting.get("description_text") or ""
    return {
        "id": posting["id"],
        "title": posting.get("title") or "Unknown",
        "company": posting.get("company_name") or "Unknown",
        "url": posting.get("apply_url") or "",
        "location": posting.get("location"),
        "contact_email": None,
        "pre_score": 0,
        "snippet": description[:300],
        "raw_text": description,
        "structured": {
            "title": posting.get("title"),
            "company": posting.get("company_name"),
            "location": posting.get("location"),
            "contract_type": posting.get("contract_type"),
            "remote": "remote" if posting.get("remote") else None,
            "required_skills": posting.get("skills") or [],
            "description": description[:2000],
        },
    }
