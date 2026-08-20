"""ARQ worker settings and scheduled jobs."""

import redis.asyncio as redis
from arq import create_pool, cron
from arq.connections import RedisSettings

from app.config import get_settings
from app.connectors.http import build_http_client
from app.db.repository import JobRepository
from app.dependencies import create_supabase_client
from app.logging_setup import get_logger, setup_logging
from app.workers.discovery import discover_via_tavily
from app.workers.embed import embed_pending_jobs
from app.workers.freshness import revalidate_stale_jobs
from app.workers.sync import seed_companies_from_yaml, sync_company_board

logger = get_logger(__name__)

QUEUE_NAME = "arq:job-engine"


def _redis_settings() -> RedisSettings:
    settings = get_settings()
    return RedisSettings.from_dsn(settings.redis_url)


async def startup(ctx: dict) -> None:
    setup_logging()
    settings = get_settings()
    ctx["settings"] = settings
    ctx["supabase"] = await create_supabase_client(settings)
    ctx["redis"] = redis.from_url(settings.redis_url, decode_responses=True)
    ctx["http"] = build_http_client()
    ctx["repo"] = JobRepository(ctx["supabase"])
    await seed_companies_from_yaml(ctx["repo"])

    # Ensure catalog fills on boot — don't wait for the next cron window.
    try:
        pool = await create_pool(
            RedisSettings.from_dsn(settings.redis_url),
            default_queue_name=QUEUE_NAME,
        )
        await pool.enqueue_job("sync_all_companies")
        await pool.aclose()
        logger.info("startup_sync_enqueued")
    except Exception as exc:
        logger.warning("startup_sync_enqueue_failed", error=str(exc))

    logger.info("worker_started")


async def shutdown(ctx: dict) -> None:
    await ctx["http"].aclose()
    await ctx["redis"].aclose()
    logger.info("worker_stopped")


async def sync_all_companies(ctx: dict) -> dict:
    """Fan-out sync across active companies."""
    repo: JobRepository = ctx["repo"]
    companies = await repo.list_active_companies()
    results = []
    for company in companies:
        result = await sync_company_board(repo, ctx["redis"], company, ctx["http"])
        results.append({"slug": company.get("slug"), **result})
    embedded = await embed_pending_jobs(repo)
    return {"companies": len(companies), "results": results, "embedded": embedded}


async def job_embed_pending(ctx: dict) -> int:
    return await embed_pending_jobs(ctx["repo"])


async def job_revalidate_stale(ctx: dict) -> dict:
    return await revalidate_stale_jobs(ctx["repo"])


async def job_discover_tavily(ctx: dict) -> dict:
    return await discover_via_tavily(ctx["repo"])


async def job_sync_company(ctx: dict, company_id: str) -> dict:
    repo: JobRepository = ctx["repo"]
    companies = await repo.list_active_companies()
    company = next((c for c in companies if c["id"] == company_id), None)
    if not company:
        return {"error": "company_not_found"}
    return await sync_company_board(repo, ctx["redis"], company, ctx["http"])


class WorkerSettings:
    """ARQ worker configuration."""

    functions = [
        sync_all_companies,
        job_embed_pending,
        job_revalidate_stale,
        job_discover_tavily,
        job_sync_company,
    ]
    cron_jobs = [
        cron(sync_all_companies, hour={0, 6, 12, 18}, minute=15),
        cron(job_embed_pending, minute={0, 20, 40}),
        cron(job_revalidate_stale, hour={3, 15}, minute=30),
        cron(job_discover_tavily, hour={8, 20}, minute=10),
    ]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = _redis_settings()
    queue_name = QUEUE_NAME
    max_tries = 3
    job_timeout = 600
