"""Simple in-memory PubSub for streaming LangGraph events to the frontend via SSE."""

import asyncio
import json
import logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

class LogEmitter:
    def __init__(self):
        # run_id -> list of queues
        self.subscribers: dict[str, list[asyncio.Queue]] = {}
        # run_id -> list of all log messages emitted so far (for late joiners/refreshes)
        self.history: dict[str, list[dict]] = {}

    def subscribe(self, run_id: str) -> asyncio.Queue:
        if run_id not in self.subscribers:
            self.subscribers[run_id] = []
        if run_id not in self.history:
            self.history[run_id] = []
            
        q = asyncio.Queue()
        self.subscribers[run_id].append(q)
        return q

    def unsubscribe(self, run_id: str, q: asyncio.Queue):
        if run_id in self.subscribers and q in self.subscribers[run_id]:
            self.subscribers[run_id].remove(q)
            # Cleanup if no one is listening and log history isn't strictly needed long-term
            # (In a real production app with Redis, we'd rely on TTLs. Here memory is fine for a dev session).

    async def emit(self, run_id: str, message: dict):
        # We ensure history exists
        if run_id not in self.history:
            self.history[run_id] = []
            
        self.history[run_id].append(message)
        
        # Broadcast to all connected clients
        if run_id in self.subscribers:
            for q in self.subscribers[run_id]:
                await q.put(message)

    async def stream(self, run_id: str) -> AsyncGenerator[str, None]:
        """Provides an SSE generator that yields history immediately, then listens for new logs."""
        q = self.subscribe(run_id)
        try:
            # Yield history first
            if run_id in self.history:
                for msg in self.history[run_id]:
                    yield f"data: {json.dumps(msg)}\n\n"
            
            # Yield active items
            while True:
                msg = await q.get()
                yield f"data: {json.dumps(msg)}\n\n"
                q.task_done()
                
        except asyncio.CancelledError:
            logger.info("SSE Stream for run=%s cancelled by client disconnect", run_id)
        finally:
            self.unsubscribe(run_id, q)

# Global singleton
log_emitter = LogEmitter()
