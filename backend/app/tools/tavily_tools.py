"""Tavily API wrappers — job search and URL extraction.

Includes validation layers:
- Search: filters out results with empty/null content
- Extract: checks for failed_results, empty content, and suspiciously short pages
"""

import logging

from tavily import AsyncTavilyClient

from app.config import get_settings
from app.exceptions import TavilyError

logger = logging.getLogger(__name__)

# Minimum content length (chars) to consider an extraction valid.
# Anything shorter is likely a redirect page, error page, or gated content.
MIN_EXTRACT_CONTENT_LENGTH = 100

# Minimum content length for search result snippets to be useful.
MIN_SEARCH_SNIPPET_LENGTH = 30


def _get_tavily_client() -> AsyncTavilyClient:
    """Build an async Tavily client."""
    settings = get_settings()
    return AsyncTavilyClient(api_key=settings.tavily_api_key)


async def search_jobs(
    query: str,
    max_results: int = 10,
    include_domains: list[str] | None = None,
    exclude_domains: list[str] | None = None,
) -> list[dict]:
    """Search for job offers using Tavily.

    Returns a list of results with url, title, content, score.
    Filters out results with empty or too-short content snippets.
    """
    client = _get_tavily_client()
    try:
        from typing import Any
        kwargs: dict[str, Any] = {
            "query": query,
            "max_results": max_results,
            "search_depth": "advanced",
            "include_raw_content": False,
        }
        if include_domains:
            kwargs["include_domains"] = include_domains
        if exclude_domains:
            kwargs["exclude_domains"] = exclude_domains

        response = await client.search(**kwargs)
        raw_results = response.get("results", [])

        # Quality gate: filter out results with empty or too-short content
        valid_results = []
        skipped = 0
        for r in raw_results:
            content = (r.get("content") or "").strip()
            if len(content) < MIN_SEARCH_SNIPPET_LENGTH:
                skipped += 1
                logger.debug(
                    "Tavily search: skipping result with short content (%d chars): %s",
                    len(content), r.get("url", "?")[:80],
                )
                continue
            valid_results.append(r)

        if skipped:
            logger.info(
                "Tavily search: filtered %d/%d results with insufficient content",
                skipped, len(raw_results),
            )
        logger.info(
            "Tavily search returned %d valid results (from %d raw) for query: %s",
            len(valid_results), len(raw_results), query[:80],
        )
        return valid_results
    except Exception as exc:
        logger.error("Tavily search failed: %s", exc)
        raise TavilyError(f"Job search failed: {exc}") from exc


async def extract_url(url: str) -> dict:
    """Extract structured content from a job offer URL using Tavily.

    Returns a dict with url, raw_content.

    Validation layers:
    1. Checks Tavily's `failed_results` for HTTP-level failures (404, 403, etc.)
    2. Verifies raw_content is present and non-trivially long
    """
    client = _get_tavily_client()
    try:
        response = await client.extract(urls=[url])

        # Layer 1: Check for Tavily-reported failures
        failed = response.get("failed_results", [])
        if failed:
            fail_info = failed[0]
            fail_url = fail_info.get("url", url)
            fail_error = fail_info.get("error", "Unknown extraction error")
            logger.warning("Tavily extraction failed for %s: %s", fail_url, fail_error)
            raise TavilyError(
                f"URL extraction failed (Tavily reported: {fail_error}): {url}"
            )

        results = response.get("results", [])
        if not results:
            raise TavilyError(f"No content extracted from URL: {url}")

        result = results[0]
        raw_content = (result.get("raw_content") or "").strip()

        # Layer 2: Content length validation
        if len(raw_content) < MIN_EXTRACT_CONTENT_LENGTH:
            logger.warning(
                "Tavily extraction returned suspiciously short content (%d chars) for %s",
                len(raw_content), url,
            )
            raise TavilyError(
                f"Extracted content too short ({len(raw_content)} chars) — "
                f"page may be gated, redirected, or empty: {url}"
            )

        logger.info(
            "Tavily extracted content from %s (%d chars)",
            url, len(raw_content),
        )
        return {
            "url": url,
            "raw_content": raw_content,
        }
    except TavilyError:
        raise
    except Exception as exc:
        logger.error("Tavily extraction failed for %s: %s", url, exc)
        raise TavilyError(f"URL extraction failed: {exc}") from exc
