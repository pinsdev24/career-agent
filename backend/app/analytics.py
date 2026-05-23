"""Lightweight, fire-and-forget analytics event tracking.

Events are inserted into the `analytics_events` Supabase table.
Use `track_event_bg()` in request handlers to avoid blocking the response.

Usage:
    from app.analytics import track_event_bg, Events
    track_event_bg(supabase, user_id, Events.PIPELINE_STARTED, {"entry_mode": "explore"})
"""

import asyncio
import logging
from datetime import datetime, timezone

from supabase import AsyncClient

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Event name constants
# ---------------------------------------------------------------------------


class Events:
    """Predefined event names for consistent tracking."""

    # Pipeline lifecycle
    PIPELINE_STARTED = "pipeline_started"
    PIPELINE_COMPLETED = "pipeline_completed"
    PIPELINE_FAILED = "pipeline_failed"

    # User actions
    CV_UPLOADED = "cv_uploaded"
    OFFER_SELECTED = "offer_selected"
    LETTER_REVIEWED = "letter_reviewed"
    LETTER_APPROVED = "letter_approved"
    APPLICATION_MARKED = "application_marked"

    # Plan events
    PLAN_LIMIT_HIT = "plan_limit_hit"
    PLAN_UPGRADED = "plan_upgraded"

    # Auth (tracked from backend if needed)
    USER_LOGIN = "user_login"
    USER_SIGNUP = "user_signup"


# ---------------------------------------------------------------------------
# Core tracking functions
# ---------------------------------------------------------------------------


async def track_event(
    supabase: AsyncClient,
    user_id: str | None,
    event_name: str,
    properties: dict | None = None,
    session_id: str | None = None,
) -> None:
    """Insert an analytics event into the database.

    This is an async function that should be awaited when you need to
    guarantee the event is recorded (e.g., for quota counting).
    """
    try:
        await supabase.table("analytics_events").insert(
            {
                "user_id": user_id,
                "event_name": event_name,
                "event_properties": properties or {},
                "session_id": session_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()
    except Exception as exc:
        # Never let analytics failures break the application
        logger.warning(
            "Failed to track event %s for user %s: %s",
            event_name,
            user_id,
            exc,
        )


def track_event_bg(
    supabase: AsyncClient,
    user_id: str | None,
    event_name: str,
    properties: dict | None = None,
    session_id: str | None = None,
) -> None:
    """Fire-and-forget event tracking via asyncio.create_task.

    Use this in request handlers where you don't need to wait for the insert.
    Failures are logged but never propagated.
    """
    asyncio.create_task(
        track_event(supabase, user_id, event_name, properties, session_id)
    )
