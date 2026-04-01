"""Tests for Tavily tools — mocked HTTP calls."""

from unittest.mock import AsyncMock, patch

import pytest

from app.exceptions import TavilyError


class TestSearchJobs:
    """Tests for the Tavily search wrapper."""

    @pytest.mark.asyncio
    async def test_search_returns_results(self) -> None:
        from app.tools.tavily_tools import search_jobs

        mock_results = [
            {
                "title": "Backend Engineer",
                "url": "https://a.com",
                "content": "Python role",
                "score": 0.9,
            },
            {"title": "Python Dev", "url": "https://b.com", "content": "Django role", "score": 0.7},
        ]

        with patch("app.tools.tavily_tools.AsyncTavilyClient") as MockClient:
            MockClient.return_value.search = AsyncMock(return_value={"results": mock_results})
            results = await search_jobs("Python backend engineer Paris", max_results=5)

        assert len(results) == 2
        assert results[0]["title"] == "Backend Engineer"

    @pytest.mark.asyncio
    async def test_search_raises_tavily_error_on_failure(self) -> None:
        from app.tools.tavily_tools import search_jobs

        with patch("app.tools.tavily_tools.AsyncTavilyClient") as MockClient:
            MockClient.return_value.search = AsyncMock(side_effect=Exception("Network error"))
            with pytest.raises(TavilyError, match="Job search failed"):
                await search_jobs("test query")

    @pytest.mark.asyncio
    async def test_search_returns_empty_on_no_results(self) -> None:
        from app.tools.tavily_tools import search_jobs

        with patch("app.tools.tavily_tools.AsyncTavilyClient") as MockClient:
            MockClient.return_value.search = AsyncMock(return_value={"results": []})
            results = await search_jobs("very obscure job query")

        assert results == []


class TestExtractUrl:
    """Tests for the Tavily URL extraction wrapper."""

    @pytest.mark.asyncio
    async def test_extract_returns_raw_content(self) -> None:
        from app.tools.tavily_tools import extract_url

        mock_extracted = [{"raw_content": "Job posting: Python Engineer at TechCorp..."}]

        with patch("app.tools.tavily_tools.AsyncTavilyClient") as MockClient:
            MockClient.return_value.extract = AsyncMock(return_value={"results": mock_extracted})
            result = await extract_url("https://example.com/job/123")

        assert result["url"] == "https://example.com/job/123"
        assert "Python Engineer" in result["raw_content"]

    @pytest.mark.asyncio
    async def test_extract_raises_on_empty_results(self) -> None:
        from app.tools.tavily_tools import extract_url

        with patch("app.tools.tavily_tools.AsyncTavilyClient") as MockClient:
            MockClient.return_value.extract = AsyncMock(return_value={"results": []})
            with pytest.raises(TavilyError, match="No content extracted"):
                await extract_url("https://example.com/broken-url")

    @pytest.mark.asyncio
    async def test_extract_raises_tavily_error_on_failure(self) -> None:
        from app.tools.tavily_tools import extract_url

        with patch("app.tools.tavily_tools.AsyncTavilyClient") as MockClient:
            MockClient.return_value.extract = AsyncMock(side_effect=Exception("HTTP 403"))
            with pytest.raises(TavilyError, match="URL extraction failed"):
                await extract_url("https://protected.com/job")
