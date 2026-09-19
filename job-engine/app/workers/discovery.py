"""Tavily discovery worker — profile-driven demand packs, then enqueue board sync."""

from app.config import get_settings
from app.connectors.tavily import TavilyDiscovery
from app.db.repository import JobRepository
from app.logging_setup import get_logger
from app.workers.demand import demand_packs_from_profile

logger = get_logger(__name__)


async def queries_from_profiles(repo: JobRepository, *, max_queries: int | None = None) -> list[str]:
    """Union demand packs from users who have a title and/or location."""
    settings = get_settings()
    cap = max_queries or settings.discovery_max_queries
    seen: set[str] = set()
    queries: list[str] = []
    for row in await repo.list_discovery_intents():
        packs = demand_packs_from_profile(
            row.get("search_preferences") or {},
            row.get("cv_structured") or {},
            max_queries=8,
        )
        for q in packs:
            key = q.lower()
            if key in seen:
                continue
            seen.add(key)
            queries.append(q)
            if len(queries) >= cap:
                return queries
    return queries


async def discover_via_tavily(
    repo: JobRepository,
    queries: list[str] | None = None,
) -> dict:
    """Discover ATS board slugs and upsert companies. Does not sync boards."""
    settings = get_settings()
    tavily = TavilyDiscovery()
    run_id = await repo.start_ingest_run("tavily_discovery")
    errors: list[str] = []
    boards: set[tuple[str, str]] = set()
    new_company_ids: list[str] = []

    resolved = [q for q in (queries or []) if (q or "").strip()]
    if not resolved:
        resolved = await queries_from_profiles(repo)
    if not resolved:
        await repo.finish_ingest_run(
            run_id,
            upserted=0,
            errors=[],
            meta={"reason": "no_demand_packs"},
        )
        logger.info("discovery_skipped", reason="no_demand_packs")
        return {"boards": 0, "company_ids": [], "errors": [], "reason": "no_demand_packs"}

    try:
        for query in resolved:
            try:
                for provider, slug in await tavily.discover_boards(query):
                    boards.add((provider, slug.lower()))
            except Exception as exc:
                errors.append(f"{query}: {exc}")

        existing = {
            (c.get("ats_provider"), (c.get("board_token") or "").lower())
            for c in await repo.list_companies(active_only=False)
        }
        active_count = await repo.count_active_companies()
        room = max(0, settings.max_active_companies - active_count)
        cap = min(settings.discovery_max_new_companies, room)

        for provider, slug in boards:
            key = (provider, slug)
            if key in existing:
                continue
            if len(new_company_ids) >= cap:
                logger.info(
                    "discovery_capped",
                    cap=cap,
                    skipped=len(boards) - len(existing),
                )
                break
            row = await repo.upsert_company(
                slug=slug,
                name=slug.replace("-", " ").title(),
                ats_provider=provider,
                board_token=slug,
                careers_url=_careers_url(provider, slug),
            )
            company_id = row.get("id")
            if company_id:
                new_company_ids.append(str(company_id))
                existing.add(key)
    except Exception as exc:
        errors.append(str(exc))
        logger.exception("discovery_failed", error=str(exc))

    await repo.finish_ingest_run(
        run_id,
        upserted=len(new_company_ids),
        errors=errors,
        meta={
            "boards": [f"{p}:{s}" for p, s in boards],
            "new_company_ids": new_company_ids,
            "queries": resolved[:16],
        },
    )
    logger.info(
        "discovery_done",
        boards=len(boards),
        new=len(new_company_ids),
        errors=len(errors),
    )
    return {"boards": len(new_company_ids), "company_ids": new_company_ids, "errors": errors}


def _careers_url(provider: str, slug: str) -> str:
    mapping = {
        "greenhouse": f"https://boards.greenhouse.io/{slug}",
        "lever": f"https://jobs.lever.co/{slug}",
        "ashby": f"https://jobs.ashbyhq.com/{slug}",
        "workable": f"https://apply.workable.com/{slug}",
    }
    return mapping.get(provider, "")
