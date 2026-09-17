"""FastAPI dependency injection.

Provides Supabase client (managed via app lifespan), LangGraph checkpointer,
and auth utilities.
"""

import logging
from typing import Annotated

import httpx
from fastapi import Depends, Header, HTTPException, Request, status
from supabase import AsyncClient, acreate_client

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Supabase client — stored on app.state, created during lifespan
# ---------------------------------------------------------------------------


async def create_supabase_client(settings: Settings) -> AsyncClient:
    """Create a new async Supabase client (service role)."""
    return await acreate_client(
        settings.supabase_url,
        settings.supabase_service_key,
    )


async def get_supabase_client(
    request: Request,
) -> AsyncClient:
    """Return the Supabase client stored in app.state.

    The client is created once during lifespan startup and stored on app.state.
    This avoids global mutable state and is safe for async request handling.
    """
    client: AsyncClient | None = getattr(request.app.state, "supabase", None)
    if client is None:
        raise RuntimeError(
            "Supabase client not initialized. "
            "Ensure it is created in the FastAPI lifespan handler."
        )
    return client


# ---------------------------------------------------------------------------
# Auth — validate Supabase JWT
# ---------------------------------------------------------------------------


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> dict:
    """Validate the Supabase JWT via Auth HTTP API.

    Do not call ``supabase.auth.get_user`` on the shared service-role client —
    that mutates client session state and 401s concurrent requests.
    """
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
        logger.warning("Auth validation failed: %s", exc)
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
            "Auth validation failed status=%s body=%s",
            response.status_code,
            response.text[:300],
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
