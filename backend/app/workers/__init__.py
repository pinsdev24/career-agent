"""Durable ARQ job enqueue — never use asyncio.create_task for business work."""

from __future__ import annotations

import logging
from typing import Any

from arq import ArqRedis, create_pool
from arq.connections import RedisSettings

from app.config import get_settings
from app.exceptions import CareerAgentError

logger = logging.getLogger(__name__)

_pool: ArqRedis | None = None


class QueueUnavailableError(CareerAgentError):
    """Raised when Redis/ARQ is required but not reachable."""

    def __init__(self, message: str = "Job queue is unavailable") -> None:
        super().__init__(message, status_code=503)


async def get_arq_pool() -> ArqRedis:
    """Return a process-wide ARQ pool, creating it on first use."""
    global _pool
    if _pool is not None:
        return _pool

    settings = get_settings()
    if not settings.redis_url:
        raise QueueUnavailableError("REDIS_URL is not configured")

    _pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    return _pool


async def close_arq_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None


async def enqueue_job(function_name: str, *args: Any, _job_id: str | None = None) -> str:
    """Enqueue an ARQ job. Returns the job id.

    `_job_id` makes enqueue idempotent: a duplicate key is ignored by ARQ.
    """
    pool = await get_arq_pool()
    job = await pool.enqueue_job(function_name, *args, _job_id=_job_id)
    if job is None:
        logger.info("arq job already queued: %s id=%s", function_name, _job_id)
        return _job_id or function_name
    logger.info("arq enqueued %s job_id=%s", function_name, job.job_id)
    return job.job_id
