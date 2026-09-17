"""Greenhouse connector contract tests with fixtures."""

import json
from pathlib import Path

import httpx
import pytest
import respx

from app.connectors.greenhouse import GreenhouseConnector
from app.connectors.lever import LeverConnector
from app.normalize.posting import content_hash, fingerprint
from app.normalize.url import canonicalize_url

FIXTURES = Path(__file__).parent / "fixtures" / "ats"


@pytest.fixture
def greenhouse_payload() -> dict:
    return json.loads((FIXTURES / "greenhouse_stripe.json").read_text())


@pytest.fixture
def lever_payload() -> list:
    return json.loads((FIXTURES / "lever_netlify.json").read_text())


@respx.mock
@pytest.mark.asyncio
async def test_greenhouse_maps_jobs(greenhouse_payload: dict):
    respx.get("https://boards-api.greenhouse.io/v1/boards/stripe/jobs").mock(
        return_value=httpx.Response(200, json=greenhouse_payload, headers={"etag": "W/\"abc\""})
    )
    async with httpx.AsyncClient() as client:
        jobs, etag, not_modified = await GreenhouseConnector(client).fetch_jobs("stripe")
    assert not not_modified
    assert etag == 'W/"abc"'
    assert len(jobs) == 1
    job = jobs[0]
    assert job.source.value == "greenhouse"
    assert job.external_id == "123"
    assert job.title == "Software Engineer"
    assert "Python" in job.description_text
    assert "boards.greenhouse.io/stripe/jobs/123" in job.apply_url


@respx.mock
@pytest.mark.asyncio
async def test_lever_maps_jobs(lever_payload: list):
    respx.get("https://api.lever.co/v0/postings/netlify").mock(
        return_value=httpx.Response(200, json=lever_payload)
    )
    async with httpx.AsyncClient() as client:
        jobs, _, not_modified = await LeverConnector(client).fetch_jobs("netlify")
    assert not not_modified
    assert len(jobs) == 1
    assert jobs[0].source.value == "lever"
    assert jobs[0].title == "Backend Engineer"
    assert jobs[0].remote is True


def test_canonicalize_strips_utm():
    url = canonicalize_url("https://Jobs.Lever.Co/Netlify/abc/?utm_source=x&ref=y")
    assert url == "https://jobs.lever.co/Netlify/abc"


def test_content_hash_stable():
    a = content_hash("Title", "Co", "Desc", "Paris")
    b = content_hash("Title", "Co", "Desc", "Paris")
    c = content_hash("Title", "Co", "Desc changed", "Paris")
    assert a == b
    assert a != c


def test_fingerprint():
    assert fingerprint("stripe", "Eng", "Remote") == fingerprint("stripe", "Eng", "Remote")
