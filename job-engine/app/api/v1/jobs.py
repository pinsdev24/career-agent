"""Jobs recommend / search / detail / signals."""

from typing import Annotated

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import AsyncClient

from app.config import get_settings
from app.db.repository import JobRepository, row_to_job_out
from app.dependencies import get_current_user, get_redis, get_supabase_client
from app.logging_setup import get_logger
from app.metrics import RECOMMEND_CACHE_HITS
from app.models.schemas import JobListResponse, JobPostingOut, SignalRequest, SignalResponse
from app.rank.scorer import Ranker, prefs_hash

logger = get_logger(__name__)
router = APIRouter(prefix="/jobs", tags=["Jobs"])


def _repo(supabase: AsyncClient) -> JobRepository:
    return JobRepository(supabase)


async def _cache_get(redis_client: redis.Redis, key: str) -> str | None:
    try:
        return await redis_client.get(key)
    except Exception as exc:
        logger.warning("redis_get_failed", error=str(exc))
        return None


async def _cache_set(redis_client: redis.Redis, key: str, ttl: int, value: str) -> None:
    try:
        await redis_client.setex(key, ttl, value)
    except Exception as exc:
        logger.warning("redis_set_failed", error=str(exc))


async def _cache_delete_pattern(redis_client: redis.Redis, pattern: str) -> None:
    try:
        async for key in redis_client.scan_iter(match=pattern):
            await redis_client.delete(key)
    except Exception as exc:
        logger.warning("redis_delete_failed", error=str(exc))


@router.get("/recommend", response_model=JobListResponse)
async def recommend(
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
    redis_client: Annotated[redis.Redis, Depends(get_redis)],
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
) -> JobListResponse:
    settings = get_settings()
    repo = _repo(supabase)
    profile = await repo.get_profile(user["id"]) or {}
    prefs = profile.get("search_preferences") or {}
    cache_key = f"recommend:{user['id']}:{prefs_hash(prefs)}:{limit}:{cursor or ''}"

    cached = await _cache_get(redis_client, cache_key)
    if cached:
        RECOMMEND_CACHE_HITS.inc()
        return JobListResponse.model_validate_json(cached)

    result = await Ranker(repo).recommend(user["id"], limit=limit, cursor=cursor)
    await _cache_set(
        redis_client,
        cache_key,
        settings.recommend_cache_ttl_seconds,
        result.model_dump_json(),
    )
    return result


@router.get("/search", response_model=JobListResponse)
async def search(
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
    q: str = Query(""),
    location: str | None = None,
    remote: bool | None = None,
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
) -> JobListResponse:
    return await Ranker(_repo(supabase)).search(
        user["id"],
        q=q,
        location=location,
        remote=remote,
        limit=limit,
        cursor=cursor,
    )


@router.get("/{job_id}", response_model=JobPostingOut)
async def get_job(
    job_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> JobPostingOut:
    row = await _repo(supabase).get_job(job_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return row_to_job_out(row)


@router.post("/{job_id}/signals", response_model=SignalResponse)
async def post_signal(
    job_id: str,
    body: SignalRequest,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
    redis_client: Annotated[redis.Redis, Depends(get_redis)],
) -> SignalResponse:
    repo = _repo(supabase)
    row = await repo.get_job(job_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    await repo.upsert_signal(user["id"], job_id, body.type.value)
    await _cache_delete_pattern(redis_client, f"recommend:{user['id']}:*")
    return SignalResponse(ok=True)
