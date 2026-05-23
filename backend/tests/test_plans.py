"""Tests for the plan system — tier definitions, quota enforcement, and usage lookups."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.plans import (
    PlanTier,
    PlanConfig,
    PLAN_CONFIGS,
    UserPlan,
    get_user_plan,
    enforce_pipeline_quota,
    enforce_cv_upload_quota,
)


# ---------------------------------------------------------------------------
# Plan configuration tests
# ---------------------------------------------------------------------------


class TestPlanConfigs:
    """Verify plan tier definitions are sane."""

    def test_free_tier_exists(self):
        assert PlanTier.FREE in PLAN_CONFIGS

    def test_pro_tier_exists(self):
        assert PlanTier.PRO in PLAN_CONFIGS

    def test_free_tier_has_limits(self):
        free = PLAN_CONFIGS[PlanTier.FREE]
        assert free.daily_pipeline_limit > 0
        assert free.daily_cv_upload_limit > 0
        assert free.max_revisions > 0
        assert free.price_monthly_eur == 0

    def test_pro_tier_is_better(self):
        free = PLAN_CONFIGS[PlanTier.FREE]
        pro = PLAN_CONFIGS[PlanTier.PRO]
        # Pro should have higher or unlimited limits
        assert pro.daily_pipeline_limit == 0 or pro.daily_pipeline_limit > free.daily_pipeline_limit
        assert pro.daily_cv_upload_limit > free.daily_cv_upload_limit
        assert pro.max_revisions > free.max_revisions
        assert pro.price_monthly_eur > 0

    def test_pro_has_email_notifications(self):
        pro = PLAN_CONFIGS[PlanTier.PRO]
        assert pro.features["email_notifications"] is True

    def test_free_no_email_notifications(self):
        free = PLAN_CONFIGS[PlanTier.FREE]
        assert free.features["email_notifications"] is False


# ---------------------------------------------------------------------------
# Plan lookup tests
# ---------------------------------------------------------------------------


class TestGetUserPlan:
    """Test fetching a user's plan from the database."""

    @pytest.fixture
    def mock_supabase(self):
        """Create a mock Supabase client."""
        mock = MagicMock()
        mock.table = MagicMock()
        return mock

    async def test_returns_free_plan_for_free_user(self, mock_supabase):
        execute_mock = AsyncMock(return_value=MagicMock(data=[{"plan": "free", "upgraded_at": None}]))
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute = execute_mock
        plan = await get_user_plan(mock_supabase, "user-123")
        assert plan.tier == PlanTier.FREE
        assert plan.config.daily_pipeline_limit == 3

    async def test_returns_pro_plan_for_pro_user(self, mock_supabase):
        execute_mock = AsyncMock(return_value=MagicMock(data=[{"plan": "pro", "upgraded_at": "2026-01-01T00:00:00Z"}]))
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute = execute_mock
        plan = await get_user_plan(mock_supabase, "user-456")
        assert plan.tier == PlanTier.PRO
        assert plan.config.daily_pipeline_limit == 0  # unlimited

    async def test_defaults_to_free_when_no_row(self, mock_supabase):
        execute_mock = AsyncMock(return_value=MagicMock(data=[]))
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute = execute_mock
        plan = await get_user_plan(mock_supabase, "user-missing")
        assert plan.tier == PlanTier.FREE


# ---------------------------------------------------------------------------
# Quota enforcement tests
# ---------------------------------------------------------------------------


class TestEnforcePipelineQuota:
    """Test daily pipeline quota enforcement."""

    def _make_plan(self, tier: PlanTier) -> UserPlan:
        return UserPlan(
            user_id="test-user",
            tier=tier,
            config=PLAN_CONFIGS[tier],
        )

    @pytest.fixture
    def mock_supabase(self):
        mock = MagicMock()
        mock.table = MagicMock()
        return mock

    async def test_allows_under_limit(self, mock_supabase):
        execute_mock = AsyncMock(return_value=MagicMock(count=1))
        mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.execute = execute_mock
        plan = self._make_plan(PlanTier.FREE)
        used = await enforce_pipeline_quota(mock_supabase, "test-user", plan)
        assert used == 1

    async def test_blocks_over_limit(self, mock_supabase):
        execute_mock = AsyncMock(return_value=MagicMock(count=3))
        mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.execute = execute_mock
        plan = self._make_plan(PlanTier.FREE)
        with pytest.raises(HTTPException) as exc_info:
            await enforce_pipeline_quota(mock_supabase, "test-user", plan)
        assert exc_info.value.status_code == 403

    async def test_pro_unlimited(self, mock_supabase):
        plan = self._make_plan(PlanTier.PRO)
        # Pro has limit=0 (unlimited), should never query DB
        used = await enforce_pipeline_quota(mock_supabase, "test-user", plan)
        assert used == 0
        mock_supabase.table.assert_not_called()
