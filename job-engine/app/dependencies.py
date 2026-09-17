"""FastAPI dependency injection — Supabase, Redis, auth."""

from typing import Annotated

import httpx
import redis.asyncio as redis
from fastapi import Depends, Header, HTTPException, Request, status
from supabase import AsyncClient, acreate_client

from app.config import Settings, get_settings
from app.logging_setup import get_logger

logger = get_logger(__name__)


async def create_supabase_client(settings: Settings) -> AsyncClient:
    """Create an async Supabase client (service role)."""
    return await acreate_client(settings.supabase_url, settings.supabase_service_key)


async def create_redis_client(settings: Settings) -> redis.Redis:
    """Create an async Redis client with short timeouts (cache is optional)."""
    return redis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
    )


async def get_supabase_client(request: Request) -> AsyncClient:
    """Return Supabase client from app.state."""
    client: AsyncClient | None = getattr(request.app.state, "supabase", None)
    if client is None:
        raise RuntimeError("Supabase client not initialized")
    return client


async def get_redis(request: Request) -> redis.Redis:
    """Return Redis client from app.state."""
    client: redis.Redis | None = getattr(request.app.state, "redis", None)
    if client is None:
        raise RuntimeError("Redis client not initialized")
    return client


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> dict:
    """Validate Supabase JWT via Auth HTTP API (no shared-client session mutation)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_service_key,
                },
            )
    except Exception as exc:
        logger.warning(
            "auth_failed",
            error=repr(exc),
            error_type=type(exc).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if response.status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if response.status_code >= 400:
        logger.warning(
            "auth_failed",
            status=response.status_code,
            body=response.text[:300],
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

    data = response.json()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"id": str(user_id), "email": data.get("email")}


async def require_admin(
    x_admin_key: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> None:
    """Gate admin endpoints behind optional admin API key."""
    if not settings.admin_api_key:
        return
    if x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
