"""Freshness revalidation worker."""

from datetime import datetime, timedelta, timezone

from app.config import get_settings
from app.connectors.tavily import TavilyDiscovery
from app.db.repository import JobRepository
from app.logging_setup import get_logger
from app.quality.gates import is_closed_job_text, passes_content_gates

logger = get_logger(__name__)


async def revalidate_stale_jobs(repo: JobRepository, limit: int = 50) -> dict:
    """Re-extract stale active jobs; expire closed/empty ones."""
    settings = get_settings()
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.freshness_stale_days)
    stale = await repo.stale_active_jobs(cutoff.isoformat(), limit=limit)
    if not stale:
        return {"checked": 0, "expired": 0, "refreshed": 0}

    tavily = TavilyDiscovery()
    expired_ids: list[str] = []
    refreshed_ids: list[str] = []

    for job in stale:
        url = job.get("apply_url")
        try:
            content = await tavily.extract(url)
            if content is None or is_closed_job_text(content) or not passes_content_gates(content):
                expired_ids.append(job["id"])
            else:
                refreshed_ids.append(job["id"])
        except Exception as exc:
            logger.warning("revalidate_failed", job_id=job["id"], error=str(exc))
            # Do not expire on transient extract failures
            continue

    await repo.mark_expired(expired_ids)
    await repo.touch_last_seen(refreshed_ids)
    logger.info(
        "revalidate_done",
        checked=len(stale),
        expired=len(expired_ids),
        refreshed=len(refreshed_ids),
    )
    return {
        "checked": len(stale),
        "expired": len(expired_ids),
        "refreshed": len(refreshed_ids),
    }
