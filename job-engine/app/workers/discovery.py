"""Tavily discovery worker — finds new ATS boards and enqueues company sync."""

from app.connectors.tavily import TavilyDiscovery
from app.db.repository import JobRepository
from app.logging_setup import get_logger

logger = get_logger(__name__)

DEFAULT_QUERIES = [
    "software engineer jobs hiring",
    "backend engineer remote careers",
    "data scientist machine learning job",
    "product manager career posting",
]


async def discover_via_tavily(
    repo: JobRepository,
    queries: list[str] | None = None,
) -> dict:
    """Discover ATS board slugs and upsert companies."""
    tavily = TavilyDiscovery()
    run_id = await repo.start_ingest_run("tavily_discovery")
    found = 0
    errors: list[str] = []
    boards: set[tuple[str, str]] = set()

    try:
        for query in queries or DEFAULT_QUERIES:
            try:
                for provider, slug in await tavily.discover_boards(query):
                    boards.add((provider, slug))
            except Exception as exc:
                errors.append(f"{query}: {exc}")

        for provider, slug in boards:
            await repo.upsert_company(
                slug=slug,
                name=slug.replace("-", " ").title(),
                ats_provider=provider,
                board_token=slug,
                careers_url=_careers_url(provider, slug),
            )
            found += 1
    except Exception as exc:
        errors.append(str(exc))
        logger.exception("discovery_failed", error=str(exc))

    await repo.finish_ingest_run(
        run_id,
        upserted=found,
        errors=errors,
        meta={"boards": [f"{p}:{s}" for p, s in boards]},
    )
    logger.info("discovery_done", boards=found, errors=len(errors))
    return {"boards": found, "errors": errors}


def _careers_url(provider: str, slug: str) -> str:
    mapping = {
        "greenhouse": f"https://boards.greenhouse.io/{slug}",
        "lever": f"https://jobs.lever.co/{slug}",
        "ashby": f"https://jobs.ashbyhq.com/{slug}",
        "workable": f"https://apply.workable.com/{slug}",
    }
    return mapping.get(provider, "")
