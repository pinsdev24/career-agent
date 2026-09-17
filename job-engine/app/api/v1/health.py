"""Health and readiness endpoints."""

from fastapi import APIRouter, Depends
from supabase import AsyncClient
import redis.asyncio as redis

from app.dependencies import get_redis, get_supabase_client
from app.models.schemas import HealthResponse, ReadyResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/ready", response_model=ReadyResponse)
async def ready(
    supabase: AsyncClient = Depends(get_supabase_client),
    redis_client: redis.Redis = Depends(get_redis),
) -> ReadyResponse:
    redis_ok = False
    supabase_ok = False
    try:
        redis_ok = bool(await redis_client.ping())
    except Exception:
        redis_ok = False
    try:
        # Lightweight check — list 1 company or empty
        await supabase.table("companies").select("id").limit(1).execute()
        supabase_ok = True
    except Exception:
        supabase_ok = False

    status = "ok" if redis_ok and supabase_ok else "degraded"
    return ReadyResponse(status=status, redis=redis_ok, supabase=supabase_ok)
