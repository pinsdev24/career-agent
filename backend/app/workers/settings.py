"""ARQ worker settings for CareerAgent packet + pipeline jobs."""

import redis.asyncio as redis

from arq.connections import RedisSettings

from app.config import get_settings
from app.dependencies import create_supabase_client
from app.graph.pubsub import configure_log_redis
from app.workers.jobs import generate_packet_job, resume_pipeline_job, run_pipeline_job

QUEUE_NAME = "arq:careeragent"


def _redis_settings() -> RedisSettings:
    settings = get_settings()
    url = settings.redis_url or "redis://localhost:6379"
    return RedisSettings.from_dsn(url)


async def startup(ctx: dict) -> None:
    settings = get_settings()
    ctx["settings"] = settings
    ctx["supabase"] = await create_supabase_client(settings)
    ctx["redis"] = redis.from_url(settings.redis_url, decode_responses=True)
    configure_log_redis(ctx["redis"])


async def shutdown(ctx: dict) -> None:
    redis_client = ctx.get("redis")
    if redis_client is not None:
        await redis_client.aclose()


class WorkerSettings:
    functions = [generate_packet_job, run_pipeline_job, resume_pipeline_job]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = _redis_settings()
    queue_name = QUEUE_NAME
    max_tries = 3
    job_timeout = 600
    keep_result = 3600
