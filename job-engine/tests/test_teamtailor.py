"""Teamtailor connector — slug-adjacent normalize, 404, empty, fixture smoke."""

import json
from pathlib import Path

import httpx
import pytest
import respx

from app.connectors.teamtailor import TeamtailorConnector, normalize_teamtailor_item
from app.models.schemas import AtsProvider

FIXTURES = Path(__file__).parent / "fixtures" / "ats"


@pytest.fixture
def teamtailor_payload() -> dict:
    return json.loads((FIXTURES / "teamtailor_acme.json").read_text())


def test_normalize_maps_jobposting_fields(teamtailor_payload: dict):
    item = teamtailor_payload["items"][0]
    job = normalize_teamtailor_item(
        item, board_token="acme", feed_title=teamtailor_payload["title"]
    )
    assert job is not None
    assert job.source == AtsProvider.TEAMTAILOR
    assert job.external_id == "1234567"
    assert job.title == "Backend Engineer"
    assert job.company_name == "Acme"
    assert job.location == "Stockholm, SE"
    assert job.country_code == "SE"
    assert "Python" in job.description_text
    assert job.apply_url.endswith("/jobs/1234567-backend-engineer")
    assert "<p>" not in job.description_text


def test_normalize_remote_from_job_location_type(teamtailor_payload: dict):
    item = teamtailor_payload["items"][1]
    job = normalize_teamtailor_item(item, board_token="acme", feed_title="Acme")
    assert job is not None
    assert job.remote is True
    assert job.external_id == "7654321"


def test_normalize_skips_item_without_id():
    assert (
        normalize_teamtailor_item(
            {"title": "Ghost", "content_html": "<p>x</p>"},
            board_token="acme",
        )
        is None
    )


def test_normalize_falls_back_without_jobposting():
    job = normalize_teamtailor_item(
        {
            "id": "feed-only-id",
            "title": "Staff Engineer",
            "url": "https://acme.teamtailor.com/jobs/99-staff-engineer",
            "content_html": (
                "<p>Design distributed systems with Go and TypeScript "
                "for our platform team.</p>"
            ),
        },
        board_token="acme",
        feed_title="Acme",
    )
    assert job is not None
    assert job.external_id == "99"
    assert job.company_name == "Acme"
    assert job.location is None


@respx.mock
@pytest.mark.asyncio
async def test_fetch_jobs_fixture_board_smoke(teamtailor_payload: dict):
    respx.get("https://acme.teamtailor.com/jobs.json").mock(
        return_value=httpx.Response(
            200, json=teamtailor_payload, headers={"etag": 'W/"tt1"'}
        )
    )
    async with httpx.AsyncClient() as client:
        jobs, etag, not_modified = await TeamtailorConnector(client).fetch_jobs("acme")
    assert not not_modified
    assert etag == 'W/"tt1"'
    assert len(jobs) == 2
    assert {j.external_id for j in jobs} == {"1234567", "7654321"}
    assert all(j.source == AtsProvider.TEAMTAILOR for j in jobs)


@respx.mock
@pytest.mark.asyncio
async def test_fetch_jobs_empty_items():
    respx.get("https://emptyco.teamtailor.com/jobs.json").mock(
        return_value=httpx.Response(
            200,
            json={
                "version": "https://jsonfeed.org/version/1.1",
                "title": "Emptyco",
                "items": [],
            },
        )
    )
    async with httpx.AsyncClient() as client:
        jobs, _, not_modified = await TeamtailorConnector(client).fetch_jobs("emptyco")
    assert not not_modified
    assert jobs == []


@respx.mock
@pytest.mark.asyncio
async def test_fetch_jobs_404_raises():
    respx.get("https://ghost.teamtailor.com/jobs.json").mock(
        return_value=httpx.Response(404, text="not found")
    )
    async with httpx.AsyncClient() as client:
        with pytest.raises(httpx.HTTPStatusError) as exc:
            await TeamtailorConnector(client).fetch_jobs("ghost")
    assert exc.value.response.status_code == 404


@respx.mock
@pytest.mark.asyncio
async def test_fetch_jobs_not_modified():
    respx.get("https://acme.teamtailor.com/jobs.json").mock(
        return_value=httpx.Response(304)
    )
    async with httpx.AsyncClient() as client:
        jobs, etag, not_modified = await TeamtailorConnector(client).fetch_jobs(
            "acme", etag='W/"keep"'
        )
    assert not_modified is True
    assert jobs == []
    assert etag == 'W/"keep"'
