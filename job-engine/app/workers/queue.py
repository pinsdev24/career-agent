"""ARQ enqueue helper — keep workers from circular-importing WorkerSettings."""

from __future__ import annotations

from arq import create_pool
from arq.connections import RedisSettings

from app.config import get_settings
from app.logging_setup import get_logger

logger = get_logger(__name__)

QUEUE_NAME = "arq:job-engine"


async def enqueue_job(function_name: str, *args) -> str | None:
    """Enqueue an ARQ job on the job-engine queue. Returns job id or None."""
    settings = get_settings()
    pool = await create_pool(
        RedisSettings.from_dsn(settings.redis_url),
        default_queue_name=QUEUE_NAME,
    )
    try:
        job = await pool.enqueue_job(function_name, *args)
        job_id = job.job_id if job else None
        logger.info("job_enqueued", function=function_name, job_id=job_id)
        return job_id
    except Exception as exc:
        logger.warning("job_enqueue_failed", function=function_name, error=str(exc))
        return None
    finally:
        await pool.aclose()
