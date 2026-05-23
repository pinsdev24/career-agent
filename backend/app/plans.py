"""Subscription plan definitions, lookups, and quota enforcement.

Architecture:
- Plan tiers are defined in PLAN_CONFIGS with all associated limits and features.
- get_user_plan() fetches the user's row from user_plans (Supabase).
- enforce_*_quota() functions count today's usage against the plan limit.
- FastAPI dependencies (require_pipeline_quota, require_cv_upload_quota) chain
  auth → plan fetch → enforcement for use in router endpoints.
"""

import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from supabase import AsyncClient

from app.dependencies import get_current_user, get_supabase_client

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Plan tier definitions
# ---------------------------------------------------------------------------


class PlanTier(str, Enum):
    FREE = "free"
    PRO = "pro"


class PlanConfig(BaseModel):
    """Immutable configuration for a plan tier."""

    tier: PlanTier
    label: str
    price_monthly_eur: float
    daily_pipeline_limit: int          # 0 = unlimited
    daily_cv_upload_limit: int
    max_revisions: int
    writer_model: str
    features: dict[str, bool]


# Central source of truth for plan limits.
# Changing a value here propagates everywhere.
PLAN_CONFIGS: dict[PlanTier, PlanConfig] = {
    PlanTier.FREE: PlanConfig(
        tier=PlanTier.FREE,
        label="Free",
        price_monthly_eur=0,
        daily_pipeline_limit=3,
        daily_cv_upload_limit=2,
        max_revisions=2,
        writer_model="gpt-5-nano",
        features={
            "email_notifications": False,
            "long_term_memory": False,
        },
    ),
    PlanTier.PRO: PlanConfig(
        tier=PlanTier.PRO,
        label="Pro",
        price_monthly_eur=5.99,
        daily_pipeline_limit=0,          # unlimited
        daily_cv_upload_limit=10,
        max_revisions=5,
        writer_model="kimi-k2.5",
        features={
            "email_notifications": True,
            "long_term_memory": True,
        },
    ),
}


# ---------------------------------------------------------------------------
# Plan lookup
# ---------------------------------------------------------------------------


class UserPlan(BaseModel):
    """The user's active plan + DB row data."""

    user_id: str
    tier: PlanTier
    config: PlanConfig
    upgraded_at: datetime | None = None


async def get_user_plan(supabase: AsyncClient, user_id: str) -> UserPlan:
    """Fetch the user's plan from user_plans. Falls back to free if missing."""
    result = (
        await supabase.table("user_plans")
        .select("plan, upgraded_at")
        .eq("id", user_id)
        .execute()
    )

    if result.data:
        row = result.data[0]
        tier = PlanTier(row["plan"])
    else:
        # Safety fallback — should never happen if trigger is set up
        tier = PlanTier.FREE
        logger.warning("No user_plans row for user %s, defaulting to free", user_id)

    return UserPlan(
        user_id=user_id,
        tier=tier,
        config=PLAN_CONFIGS[tier],
        upgraded_at=row.get("upgraded_at") if result.data else None,
    )


# ---------------------------------------------------------------------------
# Quota enforcement (DB-backed daily counts)
# ---------------------------------------------------------------------------


async def _count_today(
    supabase: AsyncClient,
    table: str,
    user_id: str,
) -> int:
    """Count rows created today (UTC) for a user in the given table."""
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    result = (
        await supabase.table(table)
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", today_start)
        .execute()
    )
    return result.count or 0


async def enforce_pipeline_quota(
    supabase: AsyncClient,
    user_id: str,
    plan: UserPlan,
) -> int:
    """Check if user can start another pipeline today.

    Returns:
        Current usage count (for display to user).

    Raises:
        HTTPException 403 if quota exceeded.
    """
    limit = plan.config.daily_pipeline_limit
    if limit == 0:  # unlimited
        return 0

    used = await _count_today(supabase, "pipeline_runs", user_id)

    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "QUOTA_EXCEEDED",
                "message": f"Daily pipeline limit reached ({limit} runs/day on {plan.tier.value} plan).",
                "limit": limit,
                "used": used,
                "plan": plan.tier.value,
            },
        )

    return used


async def enforce_cv_upload_quota(
    supabase: AsyncClient,
    user_id: str,
    plan: UserPlan,
) -> int:
    """Check if user can upload another CV today. Same pattern as pipeline quota."""
    limit = plan.config.daily_cv_upload_limit
    if limit == 0:
        return 0

    # CV uploads don't have their own table, so we count profile updates.
    # We'll use analytics_events with event_name='cv_uploaded' instead.
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    result = (
        await supabase.table("analytics_events")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("event_name", "cv_uploaded")
        .gte("created_at", today_start)
        .execute()
    )
    used = result.count or 0

    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "QUOTA_EXCEEDED",
                "message": f"Daily CV upload limit reached ({limit}/day on {plan.tier.value} plan).",
                "limit": limit,
                "used": used,
                "plan": plan.tier.value,
            },
        )

    return used


# ---------------------------------------------------------------------------
# Usage summary (for frontend display)
# ---------------------------------------------------------------------------


class PlanUsage(BaseModel):
    """Current plan + today's usage stats for the user."""

    tier: PlanTier
    label: str
    price_monthly_eur: float
    pipelines_used_today: int
    pipelines_limit_today: int           # 0 = unlimited
    cv_uploads_used_today: int
    cv_uploads_limit_today: int
    max_revisions: int
    features: dict[str, bool]


async def get_plan_usage(supabase: AsyncClient, user_id: str) -> PlanUsage:
    """Get user's plan and current daily usage for frontend display."""
    plan = await get_user_plan(supabase, user_id)

    pipelines_used = await _count_today(supabase, "pipeline_runs", user_id)

    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()
    cv_result = (
        await supabase.table("analytics_events")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("event_name", "cv_uploaded")
        .gte("created_at", today_start)
        .execute()
    )
    cv_used = cv_result.count or 0

    return PlanUsage(
        tier=plan.tier,
        label=plan.config.label,
        price_monthly_eur=plan.config.price_monthly_eur,
        pipelines_used_today=pipelines_used,
        pipelines_limit_today=plan.config.daily_pipeline_limit,
        cv_uploads_used_today=cv_used,
        cv_uploads_limit_today=plan.config.daily_cv_upload_limit,
        max_revisions=plan.config.max_revisions,
        features=plan.config.features,
    )


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------


async def require_pipeline_quota(
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> UserPlan:
    """Dependency: fetch plan and enforce pipeline quota. Returns the plan for downstream use."""
    plan = await get_user_plan(supabase, user["id"])
    await enforce_pipeline_quota(supabase, user["id"], plan)
    return plan


async def require_cv_upload_quota(
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> UserPlan:
    """Dependency: fetch plan and enforce CV upload quota."""
    plan = await get_user_plan(supabase, user["id"])
    await enforce_cv_upload_quota(supabase, user["id"], plan)
    return plan
