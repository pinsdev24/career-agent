"""ATS URL parse + JSON-API JD fetch — no Tavily required."""

from unittest.mock import AsyncMock, patch

import pytest

from app.exceptions import TavilyError
from app.tools.ats_extract import (
    AtsJobRef,
    fallback_ats_text,
    fetch_ats_job,
    humanize_board_slug,
    parse_ats_job_url,
)


MISTRAL = "https://jobs.ashbyhq.com/mistral.ai/50c74749-9fbc-471f-a647-f6cd22423ccf"
DATACAMP = "https://job-boards.greenhouse.io/datacamp/jobs/7481117"


class TestParseAtsJobUrl:
    def test_ashby_dotted_slug(self) -> None:
        ref = parse_ats_job_url(MISTRAL)
        assert ref == AtsJobRef(
            "ashby",
            "mistral.ai",
            "50c74749-9fbc-471f-a647-f6cd22423ccf",
        )
        assert humanize_board_slug(ref.slug) == "Mistral Ai"

    def test_greenhouse_job_boards(self) -> None:
        assert parse_ats_job_url(DATACAMP) == AtsJobRef(
            "greenhouse", "datacamp", "7481117"
        )

    def test_rejects_non_ats(self) -> None:
        assert parse_ats_job_url("https://www.linkedin.com/jobs/view/1") is None
        assert parse_ats_job_url("https://www.indeed.com/viewjob?jk=a") is None
        assert parse_ats_job_url("") is None


@pytest.mark.asyncio
async def test_fetch_ats_job_ashby_dotted_slug() -> None:
    board = {
        "jobs": [
            {
                "id": "50c74749-9fbc-471f-a647-f6cd22423ccf",
                "title": "AI Engineer, Product",
                "descriptionPlain": "Build product features with foundation models. " * 4,
                "jobUrl": MISTRAL,
                "location": {"name": "Paris"},
            }
        ]
    }
    with patch("app.tools.ats_extract._get_json", new=AsyncMock(return_value=board)) as get_json:
        result = await fetch_ats_job(MISTRAL)

    get_json.assert_awaited_once()
    called_url = get_json.await_args.args[0]
    assert "mistral.ai" in called_url
    assert "api.ashbyhq.com" in called_url
    assert result is not None
    assert result["source"] == "ats"
    assert result["provider"] == "ashby"
    assert result["title"] == "AI Engineer, Product"
    assert result["company"] == "Mistral Ai"
    assert "foundation models" in result["raw_content"]


@pytest.mark.asyncio
async def test_fetch_ats_job_greenhouse_job_boards() -> None:
    body = {
        "id": 7481117,
        "title": "Curriculum Developer",
        "content": "<p>Teach data skills</p>",
        "absolute_url": DATACAMP,
        "location": {"name": "Remote"},
    }
    with patch("app.tools.ats_extract._get_json", new=AsyncMock(return_value=body)) as get_json:
        result = await fetch_ats_job(DATACAMP)

    assert "boards-api.greenhouse.io" in get_json.await_args.args[0]
    assert "datacamp" in get_json.await_args.args[0]
    assert result is not None
    assert result["provider"] == "greenhouse"
    assert result["title"] == "Curriculum Developer"
    assert "Teach data skills" in result["raw_content"]


@pytest.mark.asyncio
async def test_scraper_uses_ats_api_not_tavily_for_ashby() -> None:
    from app.graph.nodes.scraper import CompanyInfo, StructuredOffer, scraper_node

    ats_payload = {
        "url": MISTRAL,
        "raw_content": "AI Engineer, Product at Mistral Ai\n\nBuild agents. " * 8,
        "source": "ats",
        "provider": "ashby",
        "title": "AI Engineer, Product",
        "company": "Mistral Ai",
    }
    structured = StructuredOffer(
        title="AI Engineer, Product",
        company_info=CompanyInfo(name="Mistral"),
        description="Build agents.",
    )
    with (
        patch("app.graph.nodes.scraper.fetch_ats_job", new=AsyncMock(return_value=ats_payload)),
        patch("app.graph.nodes.scraper.extract_url", new=AsyncMock(side_effect=AssertionError("tavily"))) as tavily,
        patch("app.graph.nodes.scraper.ChatOpenAI") as mock_llm,
    ):
        mock_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(
            return_value=structured
        )
        result = await scraper_node(
            {"run_id": "run-1", "offer_url": MISTRAL, "entry_mode": "url"},
            {},
        )

    tavily.assert_not_called()
    assert result["status"] == "matching"
    assert result["selected_offer"]["title"] == "AI Engineer, Product"
    assert result["selected_offer"]["company"] == "Mistral"


@pytest.mark.asyncio
async def test_scraper_ats_does_not_hard_fail_when_tavily_blocked() -> None:
    from app.graph.nodes.scraper import CompanyInfo, StructuredOffer, scraper_node

    structured = StructuredOffer(
        title="Unknown",
        company_info=CompanyInfo(name="Unknown"),
        description=fallback_ats_text(
            AtsJobRef("ashby", "mistral.ai", "50c74749-9fbc-471f-a647-f6cd22423ccf"),
            MISTRAL,
        )[:200],
    )
    tavily_err = TavilyError(
        "URL extraction failed (Tavily reported: Failed to fetch url): " + MISTRAL
    )
    with (
        patch("app.graph.nodes.scraper.fetch_ats_job", new=AsyncMock(return_value=None)),
        patch("app.graph.nodes.scraper.extract_url", new=AsyncMock(side_effect=tavily_err)),
        patch("app.graph.nodes.scraper.ChatOpenAI") as mock_llm,
    ):
        mock_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(
            return_value=structured
        )
        result = await scraper_node(
            {"run_id": "run-2", "offer_url": MISTRAL, "entry_mode": "url"},
            {},
        )

    assert result["status"] == "matching"
    assert result["selected_offer"]["url"] == MISTRAL
    assert "Tavily" not in (result.get("error_details") or {}).get("error", "")
    offer = result["selected_offer"]
    assert offer.get("soft_warning")
    assert "mistral.ai" in offer["raw_text"] or "Mistral" in offer["raw_text"]


@pytest.mark.asyncio
async def test_packet_backfill_uses_ats_not_tavily() -> None:
    from app.tools.ats_extract import backfill_ats_description

    posting = {
        "id": "post-1",
        "title": "",
        "company_name": "",
        "apply_url": MISTRAL,
        "description_text": "",
    }
    fetched = {
        "raw_content": "AI Engineer at Mistral Ai\n\n" + ("x" * 80),
        "title": "AI Engineer, Product",
        "company": "Mistral Ai",
    }
    with (
        patch("app.tools.ats_extract.fetch_ats_job", new=AsyncMock(return_value=fetched)),
        patch("app.tools.tavily_tools.extract_url", new=AsyncMock()) as tavily,
    ):
        updated = await backfill_ats_description(posting)

    tavily.assert_not_called()
    assert updated["description_text"].startswith("AI Engineer")
    assert updated["title"] == "AI Engineer, Product"
    assert updated["company_name"] == "Mistral Ai"
