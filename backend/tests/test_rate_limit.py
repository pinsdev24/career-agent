"""Tests for in-memory rate limiting helpers."""

import pytest
from fastapi import HTTPException

from app.rate_limit import InMemoryRateLimiter


@pytest.mark.asyncio
async def test_rate_limiter_blocks_after_limit() -> None:
    limiter = InMemoryRateLimiter()

    await limiter.check(key="user:cv", limit=2, window_seconds=60)
    await limiter.check(key="user:cv", limit=2, window_seconds=60)

    with pytest.raises(HTTPException) as exc_info:
        await limiter.check(key="user:cv", limit=2, window_seconds=60)

    assert exc_info.value.status_code == 429
    assert "Retry-After" in exc_info.value.headers


@pytest.mark.asyncio
async def test_rate_limiter_keys_are_independent() -> None:
    limiter = InMemoryRateLimiter()

    await limiter.check(key="user-a:cv", limit=1, window_seconds=60)
    await limiter.check(key="user-b:cv", limit=1, window_seconds=60)

    with pytest.raises(HTTPException):
        await limiter.check(key="user-a:cv", limit=1, window_seconds=60)
