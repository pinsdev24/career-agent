"""Tavily API wrappers — job search and URL extraction."""

import logging

from tavily import AsyncTavilyClient

from app.config import get_settings
from app.exceptions import TavilyError

logger = logging.getLogger(__name__)


def _get_tavily_client() -> AsyncTavilyClient:
    """Build an async Tavily client."""
    settings = get_settings()
    return AsyncTavilyClient(api_key=settings.tavily_api_key)


async def search_jobs(
    query: str,
    max_results: int = 10,
) -> list[dict]:
    """Search for job offers using Tavily.

    Returns a list of results with url, title, content, score.
    """
    client = _get_tavily_client()
    try:
        response = await client.search(
            query=query,
            max_results=max_results,
            search_depth="advanced",
            include_raw_content=False,
        )
        results = response.get("results", [])
        logger.info("Tavily search returned %d results for query: %s", len(results), query[:80])
        return results
    except Exception as exc:
        logger.error("Tavily search failed: %s", exc)
        raise TavilyError(f"Job search failed: {exc}") from exc


async def extract_url(url: str) -> dict:
    """Extract structured content from a job offer URL using Tavily.

    Returns a dict with url, raw_content, and extracted data.
    """
    client = _get_tavily_client()
    try:
        response = await client.extract(urls=[url])
        results = response.get("results", [])
        if not results:
            raise TavilyError(f"No content extracted from URL: {url}")

        result = results[0]
        logger.info("Tavily extracted content from: %s", url)
        return {
            "url": url,
            "raw_content": result.get("raw_content", ""),
        }
    except TavilyError:
        raise
    except Exception as exc:
        logger.error("Tavily extraction failed for %s: %s", url, exc)
        raise TavilyError(f"URL extraction failed: {exc}") from exc
