"""Supabase database operations.

All direct DB interactions go through this module.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from supabase import AsyncClient

from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------------


async def upsert_profile(
    supabase: AsyncClient,
    user_id: str,
    cv_raw_text: str,
    cv_structured: dict,
) -> dict:
    """Create or update a user profile with parsed CV data."""
    result = await supabase.table("profiles").upsert(
        {
            "id": user_id,
            "cv_raw_text": cv_raw_text,
            "cv_structured": cv_structured,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="id",
    ).execute()

    if not result.data:
        raise NotFoundError("Failed to upsert profile")
    return result.data[0]


async def get_profile(supabase: AsyncClient, user_id: str) -> dict:
    """Get a user profile by ID."""
    result = await supabase.table("profiles").select("*").eq("id", user_id).execute()
    if not result.data:
        raise NotFoundError(f"Profile not found for user {user_id}")
    return result.data[0]


# ---------------------------------------------------------------------------
# Pipeline runs
# ---------------------------------------------------------------------------


async def create_pipeline_run(
    supabase: AsyncClient,
    run_id: str,
    user_id: str,
    entry_mode: str,
    offer_url: str | None = None,
) -> dict:
    """Create a new pipeline run record."""
    result = await supabase.table("pipeline_runs").insert(
        {
            "id": run_id,
            "user_id": user_id,
            "entry_mode": entry_mode,
            "status": "started",
            "offer_url": offer_url,
        }
    ).execute()

    if not result.data:
        raise NotFoundError("Failed to create pipeline run")
    return result.data[0]


async def get_pipeline_run(
    supabase: AsyncClient,
    run_id: str,
    user_id: str,
) -> dict | None:
    """Get a pipeline run by ID (scoped to user)."""
    result = (
        await supabase.table("pipeline_runs")
        .select("*")
        .eq("id", run_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else None


async def update_pipeline_run(
    supabase: AsyncClient,
    run_id: str,
    **updates: Any,
) -> dict:
    """Update fields on a pipeline run."""
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = (
        await supabase.table("pipeline_runs")
        .update(updates)
        .eq("id", run_id)
        .execute()
    )
    if not result.data:
        raise NotFoundError(f"Pipeline run {run_id} not found")
    return result.data[0]


async def get_user_runs(supabase: AsyncClient, user_id: str) -> list[dict]:
    """Get all pipeline runs for a user, ordered by creation date."""
    result = (
        await supabase.table("pipeline_runs")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


# ---------------------------------------------------------------------------
# Job offers
# ---------------------------------------------------------------------------


async def upsert_job_offer(
    supabase: AsyncClient,
    offer_id: str,
    url: str,
    raw_text: str,
    structured: dict,
    source: str = "tavily",
) -> dict:
    """Create or update a job offer with 7-day TTL."""
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    result = await supabase.table("job_offers").upsert(
        {
            "id": offer_id,
            "url": url,
            "raw_text": raw_text,
            "structured": structured,
            "source": source,
            "expires_at": expires_at,
        },
        on_conflict="url",
    ).execute()

    return result.data[0] if result.data else {}


async def get_cached_offer(supabase: AsyncClient, url: str) -> dict | None:
    """Check if we have a non-expired cached offer for this URL."""
    now = datetime.now(timezone.utc).isoformat()
    result = (
        await supabase.table("job_offers")
        .select("*")
        .eq("url", url)
        .gte("expires_at", now)
        .execute()
    )
    return result.data[0] if result.data else None


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------


async def store_cv_embeddings(
    supabase: AsyncClient,
    user_id: str,
    embeddings: list,  # list[ChunkEmbedding]
) -> None:
    """Store CV chunk embeddings.

    Deletes existing embeddings for the user before inserting new ones.
    """
    # Clear old embeddings
    await supabase.table("cv_embeddings").delete().eq("user_id", user_id).execute()

    # Insert new ones
    rows = [
        {
            "user_id": user_id,
            "chunk_text": emb.chunk_text,
            "chunk_type": emb.chunk_type,
            "embedding": emb.embedding,
        }
        for emb in embeddings
    ]
    if rows:
        await supabase.table("cv_embeddings").insert(rows).execute()
        logger.info("Stored %d CV embeddings for user %s", len(rows), user_id)


async def store_offer_embeddings(
    supabase: AsyncClient,
    offer_id: str,
    embeddings: list,
) -> None:
    """Store offer chunk embeddings."""
    await supabase.table("offer_embeddings").delete().eq("offer_id", offer_id).execute()

    rows = [
        {
            "offer_id": offer_id,
            "chunk_text": emb.chunk_text,
            "chunk_type": emb.chunk_type,
            "embedding": emb.embedding,
        }
        for emb in embeddings
    ]
    if rows:
        await supabase.table("offer_embeddings").insert(rows).execute()
        logger.info("Stored %d offer embeddings for offer %s", len(rows), offer_id)
