"""Redis token-bucket rate limiter for ATS providers."""

import asyncio
import time

import redis.asyncio as redis

from app.config import get_settings


class TokenBucket:
    """Simple Redis-backed token bucket."""

    def __init__(self, redis_client: redis.Redis, key: str, rate_per_second: float | None = None):
        self.redis = redis_client
        self.key = f"ratelimit:{key}"
        settings = get_settings()
        self.rate = rate_per_second or settings.ats_rate_limit_per_second
        self.capacity = max(self.rate * 2, 1.0)

    async def acquire(self) -> None:
        """Block until a token is available (busy-wait with short sleep)."""
        while True:
            now = time.time()
            data = await self.redis.hgetall(self.key) or {}
            tokens = float(data.get("tokens", self.capacity))
            last = float(data.get("ts", now))
            elapsed = max(0.0, now - last)
            tokens = min(self.capacity, tokens + elapsed * self.rate)
            if tokens >= 1.0:
                tokens -= 1.0
                await self.redis.hset(self.key, mapping={"tokens": str(tokens), "ts": str(now)})
                await self.redis.expire(self.key, 60)
                return
            await asyncio.sleep(max(0.05, (1.0 - tokens) / self.rate))
