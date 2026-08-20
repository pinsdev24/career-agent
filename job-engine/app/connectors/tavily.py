"""Tavily discovery connector — search + extract with quality gates."""

from tavily import AsyncTavilyClient

from app.config import get_settings
from app.logging_setup import get_logger
from app.quality.gates import passes_content_gates
from app.quality.urls import (
    AGGREGATOR_DENYLIST,
    extract_ats_board_slug,
    is_valid_job_url,
)

logger = get_logger(__name__)

MIN_SNIPPET = 30


class TavilyDiscovery:
    """Discover ATS boards and verified postings via Tavily."""

    def __init__(self, api_key: str | None = None):
        settings = get_settings()
        self.client = AsyncTavilyClient(api_key=api_key or settings.tavily_api_key)
        self.min_extract = settings.min_extract_chars

    async def search(self, query: str, max_results: int = 15) -> list[dict]:
        """Search ATS domains; filter aggregators and weak snippets."""
        include_domains = [
            "boards.greenhouse.io",
            "job-boards.greenhouse.io",
            "jobs.lever.co",
            "jobs.ashbyhq.com",
            "apply.workable.com",
        ]
        response = await self.client.search(
            query=query,
            max_results=max_results,
            search_depth="advanced",
            include_domains=include_domains,
            exclude_domains=list(AGGREGATOR_DENYLIST),
        )
        results = []
        for item in response.get("results", []):
            url = item.get("url") or ""
            content = (item.get("content") or "").strip()
            if len(content) < MIN_SNIPPET:
                continue
            if not is_valid_job_url(url):
                continue
            results.append(item)
        logger.info("tavily_search", query=query[:80], count=len(results))
        return results

    async def extract(self, url: str) -> str | None:
        """Extract page text; return None if quality gates fail."""
        response = await self.client.extract(urls=[url])
        if response.get("failed_results"):
            return None
        results = response.get("results") or []
        if not results:
            return None
        raw = (results[0].get("raw_content") or "").strip()
        if not passes_content_gates(raw, min_chars=self.min_extract):
            return None
        return raw

    async def discover_boards(self, query: str) -> list[tuple[str, str]]:
        """Return unique (provider, board_slug) pairs from search hits."""
        hits = await self.search(query)
        boards: dict[tuple[str, str], None] = {}
        for hit in hits:
            parsed = extract_ats_board_slug(hit.get("url") or "")
            if parsed:
                boards[parsed] = None
        return list(boards.keys())
