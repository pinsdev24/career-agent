"""Fire-and-forget Cut 2 URL seed onto the Job Engine ARQ queue.

Never raises — letter/packet/scout paths must keep working if Redis or
Job Engine is down. Non-ATS URLs are skipped before enqueue.
"""

from __future__ import annotations

import hashlib
import logging

from arq import create_pool
from arq.connections import RedisSettings

from app.config import get_settings

logger = logging.getLogger(__name__)

JOB_ENGINE_QUEUE = "arq:job-engine"


def _seedable(url: str | None) -> tuple[str, str] | None:
    from app.graph.nodes.scout import extract_seedable_ats_slug

    return extract_seedable_ats_slug(url or "")


async def seed_board_from_url(url: str | None) -> None:
    """Enqueue Job Engine ``job_seed_url`` when the URL is a known ATS board."""
    if not url or not str(url).strip():
        return
    parsed = _seedable(url)
    if not parsed:
        logger.info("url_seed_skip_non_ats url=%s", str(url)[:120])
        return
    await _enqueue_seed(str(url).strip(), parsed)


async def seed_boards_from_urls(urls: list[str] | None) -> None:
    """Seed unique ATS boards from Scout/pipeline URL lists."""
    seen: set[tuple[str, str]] = set()
    for url in urls or []:
        parsed = _seedable(url)
        if not parsed or parsed in seen:
            continue
        seen.add(parsed)
        await _enqueue_seed(url, parsed)


async def _enqueue_seed(url: str, parsed: tuple[str, str]) -> None:
    settings = get_settings()
    if not settings.redis_url:
        return
    provider, slug = parsed
    digest = hashlib.sha256(f"{provider}:{slug}".encode()).hexdigest()[:16]
    pool = None
    try:
        pool = await create_pool(
            RedisSettings.from_dsn(settings.redis_url),
            default_queue_name=JOB_ENGINE_QUEUE,
        )
        await pool.enqueue_job("job_seed_url", url, _job_id=f"url-seed:{digest}")
        logger.info("url_seed_enqueued provider=%s slug=%s", provider, slug)
    except Exception as exc:
        logger.warning("url_seed_enqueue_failed error=%s", exc)
    finally:
        if pool is not None:
            await pool.aclose()
