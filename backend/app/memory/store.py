"""Supabase-backed memory store for user preferences and application history.

Uses the user_memories table with a simple key-value model:
  - ("preferences")       → tone, style, formatting prefs
  - ("application_history") → summary of past applications
  - ("learned_patterns")    → extracted patterns (industries, roles, companies)

Each user has at most one row per memory_key (UNIQUE constraint).
"""

import logging
from datetime import datetime, timezone
from typing import Any

from supabase import AsyncClient

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Core CRUD operations
# ---------------------------------------------------------------------------


async def get_user_memory(
    supabase: AsyncClient,
    user_id: str,
    memory_key: str,
) -> dict | None:
    """Retrieve a specific memory entry for a user.

    Returns the memory_data dict, or None if not found.
    """
    result = (
        await supabase.table("user_memories")
        .select("memory_data")
        .eq("user_id", user_id)
        .eq("memory_key", memory_key)
        .execute()
    )
    if result.data:
        return result.data[0].get("memory_data", {})
    return None


async def upsert_user_memory(
    supabase: AsyncClient,
    user_id: str,
    memory_key: str,
    memory_data: dict,
) -> dict:
    """Create or update a memory entry for a user.

    Uses Supabase upsert with the (user_id, memory_key) unique constraint.
    """
    result = await supabase.table("user_memories").upsert(
        {
            "user_id": user_id,
            "memory_key": memory_key,
            "memory_data": memory_data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="user_id,memory_key",
    ).execute()

    if not result.data:
        logger.warning("Memory upsert returned no data for user=%s key=%s", user_id, memory_key)
        return {}
    return result.data[0]


async def get_all_user_memories(
    supabase: AsyncClient,
    user_id: str,
) -> dict[str, dict]:
    """Retrieve all memory entries for a user, keyed by memory_key."""
    result = (
        await supabase.table("user_memories")
        .select("memory_key, memory_data")
        .eq("user_id", user_id)
        .execute()
    )
    return {row["memory_key"]: row["memory_data"] for row in (result.data or [])}


# ---------------------------------------------------------------------------
# High-level helpers
# ---------------------------------------------------------------------------


async def get_user_preferences(
    supabase: AsyncClient,
    user_id: str,
) -> dict:
    """Get stored user preferences (tone, industries, role types, etc.).

    Returns a dict with these possible keys:
      - preferred_tone: str
      - preferred_industries: list[str]
      - preferred_role_types: list[str]
      - preferred_company_sizes: list[str]
      - letter_style_notes: str
      - successful_patterns: list[dict]
    """
    prefs = await get_user_memory(supabase, user_id, "preferences")
    return prefs or {}


async def update_user_preferences(
    supabase: AsyncClient,
    user_id: str,
    updates: dict[str, Any],
) -> dict:
    """Merge updates into existing user preferences (non-destructive)."""
    existing = await get_user_preferences(supabase, user_id)
    merged = {**existing, **updates}
    await upsert_user_memory(supabase, user_id, "preferences", merged)
    logger.info("Memory: updated preferences for user=%s (keys=%s)", user_id, list(updates.keys()))
    return merged


async def record_application(
    supabase: AsyncClient,
    user_id: str,
    application_summary: dict,
) -> None:
    """Append an application summary to the user's history.

    application_summary should contain:
      - company: str
      - role: str
      - match_score: int
      - critic_score: int
      - tone_used: str
      - date: str (ISO format)
    """
    history = await get_user_memory(supabase, user_id, "application_history")
    if history is None:
        history = {"applications": []}

    # Keep last 50 applications (FIFO)
    apps = history.get("applications", [])
    apps.append(application_summary)
    if len(apps) > 50:
        apps = apps[-50:]

    history["applications"] = apps
    await upsert_user_memory(supabase, user_id, "application_history", history)
    logger.info(
        "Memory: recorded application for user=%s company=%s",
        user_id,
        application_summary.get("company", "unknown"),
    )
