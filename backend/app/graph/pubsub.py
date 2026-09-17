"""Log emitter for SSE — Redis when configured so API and workers share history."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, AsyncGenerator

import redis.asyncio as redis

logger = logging.getLogger(__name__)

_HISTORY_TTL_SECONDS = 60 * 60 * 24


class LogEmitter:
    def __init__(self) -> None:
        self.subscribers: dict[str, list[asyncio.Queue]] = {}
        self._buffer: dict[str, list[dict]] = {}
        self._redis: redis.Redis | None = None

    def configure_redis(self, client: redis.Redis | None) -> None:
        self._redis = client

    def subscribe(self, run_id: str) -> asyncio.Queue:
        if run_id not in self.subscribers:
            self.subscribers[run_id] = []
        if run_id not in self._buffer:
            self._buffer[run_id] = []
        q: asyncio.Queue = asyncio.Queue()
        self.subscribers[run_id].append(q)
        return q

    def unsubscribe(self, run_id: str, q: asyncio.Queue) -> None:
        if run_id in self.subscribers and q in self.subscribers[run_id]:
            self.subscribers[run_id].remove(q)

    async def emit(self, run_id: str, message: dict) -> None:
        if not run_id:
            return
        if run_id not in self._buffer:
            self._buffer[run_id] = []
        self._buffer[run_id].append(message)

        if self._redis is not None:
            payload = json.dumps(message)
            try:
                key = f"logs:{run_id}"
                await self._redis.rpush(key, payload)
                await self._redis.expire(key, _HISTORY_TTL_SECONDS)
                await self._redis.publish(f"logs-channel:{run_id}", payload)
            except Exception as exc:
                logger.warning("redis log emit failed run=%s: %s", run_id, exc)

        if run_id in self.subscribers:
            for q in self.subscribers[run_id]:
                await q.put(message)

    async def events(self, run_id: str) -> list[dict]:
        return await self._history(run_id)

    async def _history(self, run_id: str) -> list[dict]:
        if self._redis is not None:
            try:
                raw = await self._redis.lrange(f"logs:{run_id}", 0, -1)
                events: list[dict] = []
                for item in raw:
                    if isinstance(item, dict):
                        events.append(item)
                        continue
                    if isinstance(item, bytes):
                        item = item.decode("utf-8")
                    try:
                        parsed = json.loads(item)
                    except (TypeError, json.JSONDecodeError):
                        continue
                    if isinstance(parsed, dict):
                        events.append(parsed)
                return events
            except Exception as exc:
                logger.warning("redis log history failed run=%s: %s", run_id, exc)
        return list(self._buffer.get(run_id, []))

    async def stream(self, run_id: str) -> AsyncGenerator[str, None]:
        q = self.subscribe(run_id)
        pubsub = None
        try:
            for msg in await self._history(run_id):
                yield f"data: {json.dumps(msg)}\n\n"

            # Comments flush proxies that otherwise buffer until the stream ends.
            yield ": connected\n\n"

            if self._redis is not None:
                pubsub = self._redis.pubsub()
                await pubsub.subscribe(f"logs-channel:{run_id}")
                while True:
                    message = await pubsub.get_message(
                        ignore_subscribe_messages=True, timeout=1.0
                    )
                    if message and message.get("data"):
                        data = message["data"]
                        if isinstance(data, bytes):
                            data = data.decode("utf-8")
                        yield f"data: {data}\n\n"
                    else:
                        yield ": keepalive\n\n"
            else:
                while True:
                    try:
                        msg = await asyncio.wait_for(q.get(), timeout=15.0)
                    except TimeoutError:
                        yield ": keepalive\n\n"
                        continue
                    yield f"data: {json.dumps(msg)}\n\n"
                    q.task_done()
        except asyncio.CancelledError:
            logger.info("SSE Stream for run=%s cancelled by client disconnect", run_id)
        finally:
            if pubsub is not None:
                try:
                    await pubsub.unsubscribe(f"logs-channel:{run_id}")
                    await pubsub.aclose()
                except Exception:
                    pass
            self.unsubscribe(run_id, q)


log_emitter = LogEmitter()


def configure_log_redis(client: Any) -> None:
    log_emitter.configure_redis(client)
