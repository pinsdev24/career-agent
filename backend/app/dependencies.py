"""FastAPI dependency injection.

Provides Supabase client (managed via app lifespan), LangGraph checkpointer,
and auth utilities.
"""

import logging
from typing import Annotated

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
    supabase: AsyncClient = Depends(get_supabase_client),
) -> dict:
    """Extract and validate the user from the Supabase JWT Bearer token.

    Returns a minimal user dict: {"id": str, "email": str}.

    Raises:
        HTTPException 401: If token is missing, malformed, or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        response = await supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"id": str(response.user.id), "email": response.user.email}
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Auth validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
