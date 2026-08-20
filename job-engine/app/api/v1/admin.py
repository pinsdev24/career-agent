"""Admin ingest stats and trigger helpers."""

from typing import Annotated

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import APIRouter, Depends
from supabase import AsyncClient

from app.config import get_settings
from app.db.repository import JobRepository
from app.dependencies import get_supabase_client, require_admin
from app.models.schemas import IngestStatsResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/ingest/stats", response_model=IngestStatsResponse)
async def ingest_stats(
    _: Annotated[None, Depends(require_admin)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> IngestStatsResponse:
    stats = await JobRepository(supabase).ingest_stats()
    return IngestStatsResponse(**stats)


@router.post("/ingest/sync")
async def trigger_sync(
    _: Annotated[None, Depends(require_admin)],
) -> dict:
    settings = get_settings()
    redis = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    job = await redis.enqueue_job("sync_all_companies")
    await redis.aclose()
    return {"enqueued": True, "job_id": job.job_id if job else None}


@router.post("/ingest/discover")
async def trigger_discover(
    _: Annotated[None, Depends(require_admin)],
) -> dict:
    settings = get_settings()
    redis = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    job = await redis.enqueue_job("job_discover_tavily")
    await redis.aclose()
    return {"enqueued": True, "job_id": job.job_id if job else None}
