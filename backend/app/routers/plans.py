"""Plans router — plan info and usage stats."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase import AsyncClient

from app.dependencies import get_current_user, get_supabase_client
from app.plans import (
    PLAN_CONFIGS,
    PlanConfig,
    PlanTier,
    PlanUsage,
    get_plan_usage,
)

router = APIRouter()
logger = logging.getLogger(__name__)


class PlanLimitsResponse(BaseModel):
    """All available plan tiers with their limits (for pricing page)."""

    plans: list[PlanConfig]


@router.get("/current", response_model=PlanUsage)
async def get_current_plan(
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> PlanUsage:
    """Get the current user's plan and today's usage stats."""
    return await get_plan_usage(supabase, user["id"])


@router.get("/limits", response_model=PlanLimitsResponse)
async def get_plan_limits() -> PlanLimitsResponse:
    """Get all available plan tiers with their limits (public, for pricing display)."""
    return PlanLimitsResponse(
        plans=list(PLAN_CONFIGS.values()),
    )
