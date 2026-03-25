"""Shared pytest fixtures and configuration."""

import os
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

# ---------------------------------------------------------------------------
# Environment — set fake keys BEFORE any app module is imported
# ---------------------------------------------------------------------------

os.environ.setdefault("OPENAI_API_KEY", "sk-test-fake-key-for-testing")
os.environ.setdefault("TAVILY_API_KEY", "tvly-test-fake-key-for-testing")
os.environ.setdefault("SUPABASE_URL", "https://nbyxjxjpzvovxhoelkzx.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")
os.environ.setdefault("SUPABASE_DB_URL", "postgresql://postgres:test@localhost:5432/postgres")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")


# ---------------------------------------------------------------------------
# Helpers for building synthetic PDFs
# ---------------------------------------------------------------------------


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    """Return bytes of a minimal valid PDF with CV-like content."""
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (50, 72),
        (
            "Jane Doe\n"
            "jane.doe@example.com | +33 6 12 34 56 78\n"
            "Paris, France\n\n"
            "SUMMARY\n"
            "Experienced Python developer with 5 years in backend systems.\n\n"
            "EXPERIENCE\n"
            "Senior Engineer — Acme Corp (2022-2025)\n"
            "  - Built distributed APIs with FastAPI and PostgreSQL\n"
            "  - Led team of 4 engineers\n\n"
            "SKILLS\n"
            "Python, FastAPI, PostgreSQL, Docker, LangChain, Redis\n\n"
            "EDUCATION\n"
            "MSc Computer Science — Université Paris-Saclay (2020)\n\n"
            "LANGUAGES\n"
            "French (native), English (fluent)"
        ),
    )
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.fixture
def sample_cv_text() -> str:
    return (
        "Jane Doe\njane.doe@example.com\nParis, France\n\n"
        "SUMMARY\nExperienced Python developer with 5 years in backend systems.\n\n"
        "SKILLS\nPython, FastAPI, PostgreSQL, Docker, LangChain, Redis\n\n"
        "EXPERIENCE\nSenior Engineer — Acme Corp (2022-2025)\n"
        "Built distributed APIs with FastAPI and PostgreSQL\n\n"
        "EDUCATION\nMSc Computer Science — Université Paris-Saclay (2020)"
    )


@pytest.fixture
def sample_offer() -> dict:
    return {
        "id": "offer-123",
        "title": "Backend Engineer",
        "company": "TechCorp",
        "url": "https://example.com/job/123",
        "location": "Paris",
        "snippet": "We are looking for a Backend Engineer with Python and FastAPI skills.",
        "pre_score": 82.0,
        "raw_text": (
            "Backend Engineer at TechCorp\n"
            "We are looking for a Python Backend Engineer.\n"
            "Required: Python, FastAPI, PostgreSQL, Docker\n"
            "Nice to have: Redis, Kubernetes\n"
            "Location: Paris (hybrid)\n"
            "Contract: CDI"
        ),
        "structured": {
            "title": "Backend Engineer",
            "company": "TechCorp",
            "location": "Paris",
            "contract_type": "CDI",
            "remote": "hybrid",
            "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            "nice_to_have_skills": ["Redis", "Kubernetes"],
            "experience_level": "mid",
            "description": "Backend role at TechCorp requiring Python and FastAPI.",
            "salary": None,
        },
    }


@pytest.fixture
def sample_agent_state(sample_cv_text: str, sample_offer: dict) -> dict:
    """Return a populated AgentState-like dict for node tests."""
    return {
        "user_id": "user-abc",
        "run_id": "run-xyz",
        "entry_mode": "explore",
        "cv_text": sample_cv_text,
        "cv_structured": {
            "full_name": "Jane Doe",
            "email": "jane.doe@example.com",
            "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "LangChain"],
            "summary": "Experienced Python developer with 5 years in backend systems.",
        },
        "search_preferences": {
            "location": "Paris",
            "contract_type": "CDI",
            "job_title": "Backend Engineer",
        },
        "tone_of_voice": "professional",
        "discovered_offers": [sample_offer],
        "selected_offer": sample_offer,
        "gap_report": {
            "match_score": 85,
            "matching_skills": ["Python", "FastAPI", "PostgreSQL"],
            "missing_skills": ["Kubernetes"],
            "summary": "Strong match. Candidate has most required skills.",
        },
        "match_score": 85,
        "draft_letter": (
            "Dear Hiring Manager,\n\n"
            "I am writing to apply for the Backend Engineer position at TechCorp. "
            "With 5 years of Python and FastAPI experience, I am confident I can "
            "contribute significantly to your team.\n\n"
            "Best regards,\nJane Doe"
        ),
        "revision_count": 1,
        "critic_score": 78,
        "critic_feedback": {
            "relevance": 82,
            "tone": 80,
            "structure": 75,
            "specificity": 70,
            "persuasiveness": 78,
            "overall": 78,
            "feedback": "Add more specific examples from your experience at Acme Corp.",
        },
        "status": "critiquing",
    }


@pytest.fixture
def mock_runnable_config() -> dict:
    """Return a minimal RunnableConfig-like dict."""
    return {"configurable": {"thread_id": "thread-test-123"}}


# ---------------------------------------------------------------------------
# FastAPI test client
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_supabase() -> MagicMock:
    """Return a MagicMock Supabase client."""
    client = MagicMock()
    client.auth = MagicMock()
    client.auth.get_user = AsyncMock(return_value=MagicMock(
        user=MagicMock(id="user-abc", email="jane@example.com")
    ))
    # Mock table operations
    table = MagicMock()
    table.select.return_value = table
    table.insert.return_value = table
    table.update.return_value = table
    table.upsert.return_value = table
    table.delete.return_value = table
    table.eq.return_value = table
    table.order.return_value = table
    table.gte.return_value = table
    table.execute = AsyncMock(return_value=MagicMock(data=[]))
    client.table.return_value = table
    return client


@pytest_asyncio.fixture
async def async_client(mock_supabase: MagicMock) -> AsyncGenerator[AsyncClient, None]:
    """Return an async HTTP client for API testing with mocked dependencies."""
    from app.main import app

    app.state.supabase = mock_supabase

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
