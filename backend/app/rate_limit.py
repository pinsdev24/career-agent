"""Small in-memory rate limiting helpers for expensive authenticated actions."""

import asyncio
import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status

from app.config import Settings, get_settings
from app.dependencies import get_current_user


class InMemoryRateLimiter:
    """Sliding-window limiter keyed by user and action.

    This protects a single backend process. Use a shared store such as Redis
    when running multiple API instances or workers.
    """

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check(self, *, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        cutoff = now - window_seconds

        async with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()

            if len(events) >= limit:
                retry_after = max(1, int(events[0] + window_seconds - now))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again later.",
                    headers={"Retry-After": str(retry_after)},
                )

            events.append(now)


_limiter = InMemoryRateLimiter()
_redis: Any = None


def configure_rate_limit_redis(client: Any) -> None:
    """Share Redis across API workers for multi-instance rate limits."""
    global _redis
    _redis = client


def user_rate_limit(
    *,
    action: str,
    limit_getter: Callable[[Settings], int],
    window_getter: Callable[[Settings], int],
) -> Callable[..., Awaitable[None]]:
    async def dependency(
        user: Annotated[dict, Depends(get_current_user)],
        settings: Annotated[Settings, Depends(get_settings)],
    ) -> None:
        key = f"{action}:{user['id']}"
        limit = limit_getter(settings)
        window_seconds = window_getter(settings)
        if _redis is not None:
            try:
                redis_key = f"rl:{key}"
                count = await _redis.incr(redis_key)
                if count == 1:
                    await _redis.expire(redis_key, window_seconds)
                if count > limit:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Too many requests. Please try again later.",
                        headers={"Retry-After": str(window_seconds)},
                    )
                return
            except HTTPException:
                raise
            except Exception:
                pass
        await _limiter.check(
            key=key,
            limit=limit,
            window_seconds=window_seconds,
        )

    return dependency


rate_limit_cv_upload = user_rate_limit(
    action="cv_upload",
    limit_getter=lambda settings: settings.cv_upload_rate_limit,
    window_getter=lambda settings: settings.cv_upload_rate_window_seconds,
)

rate_limit_pipeline_start = user_rate_limit(
    action="pipeline_start",
    limit_getter=lambda settings: settings.pipeline_start_rate_limit,
    window_getter=lambda settings: settings.pipeline_start_rate_window_seconds,
)
