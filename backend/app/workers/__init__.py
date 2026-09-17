"""Durable ARQ job enqueue — never use asyncio.create_task for business work."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from arq import ArqRedis, create_pool
from arq.connections import RedisSettings

from app.config import get_settings
from app.exceptions import CareerAgentError
from app.workers.settings import QUEUE_NAME

logger = logging.getLogger(__name__)

_pool: ArqRedis | None = None


class QueueUnavailableError(CareerAgentError):
    """Raised when Redis/ARQ is required but not reachable."""

    def __init__(self, message: str = "Job queue is unavailable") -> None:
        super().__init__(
            "Job queue is unavailable. Start Redis and `arq app.workers.settings.WorkerSettings`.",
            status_code=503,
        )


async def get_arq_pool() -> ArqRedis:
    """Return a process-wide ARQ pool, creating it on first use."""
    global _pool
    if _pool is not None:
        return _pool

    settings = get_settings()
    if not settings.redis_url:
        raise QueueUnavailableError()

    _pool = await create_pool(
        RedisSettings.from_dsn(settings.redis_url),
        default_queue_name=QUEUE_NAME,
    )
    return _pool


async def close_arq_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None


async def _run_inline(function_name: str, args: tuple[Any, ...]) -> None:
    """Dev fallback when Redis is not running — still persists to Postgres."""
    from app.dependencies import create_supabase_client
    from app.workers.jobs import generate_packet_job, resume_pipeline_job, run_pipeline_job

    settings = get_settings()
    supabase = await create_supabase_client(settings)
    ctx = {"supabase": supabase, "settings": settings}
    jobs = {
        "generate_packet_job": generate_packet_job,
        "run_pipeline_job": run_pipeline_job,
        "resume_pipeline_job": resume_pipeline_job,
    }
    fn = jobs.get(function_name)
    if fn is None:
        logger.error("unknown inline job %s", function_name)
        return
    try:
        await fn(ctx, *args)
    except Exception:
        logger.exception("inline job %s failed", function_name)


async def enqueue_job(function_name: str, *args: Any, _job_id: str | None = None) -> str:
    """Enqueue an ARQ job. Returns the job id.

    `_job_id` makes enqueue idempotent: a duplicate key is ignored by ARQ.
    Falls back to an in-process task only when Redis is optional/unavailable.
    """
    settings = get_settings()
    if settings.redis_url:
        try:
            pool = await get_arq_pool()
            job = await pool.enqueue_job(function_name, *args, _job_id=_job_id)
            if job is None:
                logger.info("arq job already queued: %s id=%s", function_name, _job_id)
                return _job_id or function_name
            logger.info("arq enqueued %s job_id=%s", function_name, job.job_id)
            return job.job_id
        except Exception as exc:
            if settings.require_redis:
                logger.warning("ARQ enqueue failed: %s", exc)
                raise QueueUnavailableError() from exc
            logger.warning("ARQ unavailable (%s); running %s inline", exc, function_name)

    elif settings.require_redis:
        raise QueueUnavailableError()

    asyncio.create_task(_run_inline(function_name, args))
    return _job_id or function_name
