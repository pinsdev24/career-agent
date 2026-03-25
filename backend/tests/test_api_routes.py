"""Tests for FastAPI routes — auth and pipeline endpoints."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

FAKE_TOKEN = "Bearer fake-valid-jwt-token"


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_returns_ok(self, async_client) -> None:
        response = await async_client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Profile endpoints
# ---------------------------------------------------------------------------

class TestProfileEndpoints:
    """Test profile router — auth required."""

    @pytest.mark.asyncio
    async def test_get_profile_requires_auth(self, async_client) -> None:
        response = await async_client.get("/profile/", follow_redirects=True)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_profile_with_valid_token(
        self, async_client, mock_supabase: MagicMock
    ) -> None:
        # Mock profile DB response
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{
                "id": "user-abc",
                "cv_raw_text": "Jane Doe\nPython Developer",
                "cv_structured": {},
                "tone_of_voice": "professional",
                "search_preferences": {},
                "created_at": "2026-03-24T00:00:00Z",
                "updated_at": "2026-03-24T00:00:00Z",
            }])
        )
        response = await async_client.get(
            "/profile/",
            headers={"Authorization": FAKE_TOKEN},
            follow_redirects=True,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_upload_cv_requires_auth(self, async_client) -> None:
        response = await async_client.post("/profile/cv")
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Pipeline endpoints
# ---------------------------------------------------------------------------

class TestPipelineEndpoints:
    """Test pipeline router — run creation and status."""

    @pytest.mark.asyncio
    async def test_start_pipeline_requires_auth(self, async_client) -> None:
        response = await async_client.post("/pipeline/start", json={
            "entry_mode": "url",
            "offer_url": "https://example.com/job",
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_start_pipeline_creates_run(
        self, async_client, mock_supabase: MagicMock
    ) -> None:
        # Mock insert operation
        mock_supabase.table.return_value.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "run-new-123"}])
        )

        response = await async_client.post(
            "/pipeline/start",
            json={"entry_mode": "url", "offer_url": "https://example.com/job/1"},
            headers={"Authorization": FAKE_TOKEN},
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["status"] == "started"

    @pytest.mark.asyncio
    async def test_get_run_requires_auth(self, async_client) -> None:
        response = await async_client.get("/pipeline/some-run-id")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_nonexistent_run_returns_404(
        self, async_client, mock_supabase: MagicMock
    ) -> None:
        # Mock empty DB response
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[])
        )
        response = await async_client.get(
            "/pipeline/nonexistent-run-id",
            headers={"Authorization": FAKE_TOKEN},
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# HITL endpoints
# ---------------------------------------------------------------------------

class TestHITLEndpoints:
    """Test HITL resume endpoints."""

    @pytest.mark.asyncio
    async def test_select_offer_requires_auth(self, async_client) -> None:
        response = await async_client.post(
            "/hitl/some-run-id/select-offer",
            json={"selected_offer_id": "offer-123"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_review_letter_requires_auth(self, async_client) -> None:
        response = await async_client.post(
            "/hitl/some-run-id/review-letter",
            json={"approved": True},
        )
        assert response.status_code == 401
