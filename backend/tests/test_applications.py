"""Tests for application packet APIs."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

FAKE_TOKEN = "Bearer fake-valid-jwt-token"


@pytest.mark.asyncio
async def test_create_application_requires_auth(async_client) -> None:
    response = await async_client.post("/applications", json={"posting_id": "job-1"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_application_enqueues_packet(
    async_client, mock_supabase: MagicMock
) -> None:
    profile_row = {
        "id": "user-abc",
        "cv_raw_text": "Jane Doe Python",
        "cv_structured": {},
        "search_preferences": {},
        "tone_of_voice": "professional",
        "language_preference": "en",
    }
    posting_row = {
        "id": "job-1",
        "title": "Backend Engineer",
        "company_name": "Acme",
        "apply_url": "https://jobs.lever.co/acme/1",
        "description_text": "Python FastAPI role",
        "status": "active",
        "location": "Paris",
        "skills": ["Python"],
    }
    application_row = {
        "id": "app-1",
        "user_id": "user-abc",
        "posting_id": "job-1",
        "status": "generating",
        "pipeline_run_id": None,
        "error_details": None,
        "submitted_at": None,
        "created_at": "2026-08-20T00:00:00Z",
        "updated_at": "2026-08-20T00:00:00Z",
    }

    async def execute_side_effect():
        return MagicMock(data=[])

    table = mock_supabase.table.return_value
    table.execute = AsyncMock(
        side_effect=[
            MagicMock(data=[profile_row]),
            MagicMock(data=[posting_row]),
            MagicMock(data=[]),
            MagicMock(data=[application_row]),
        ]
    )

    with patch("app.routers.applications.enqueue_job", new_callable=AsyncMock) as enqueue:
        response = await async_client.post(
            "/applications",
            json={"posting_id": "job-1"},
            headers={"Authorization": FAKE_TOKEN},
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "generating"
    assert body["posting_id"] == "job-1"
    enqueue.assert_awaited()


@pytest.mark.asyncio
async def test_inbox_requires_auth(async_client) -> None:
    response = await async_client.get("/applications/inbox")
    assert response.status_code == 401
