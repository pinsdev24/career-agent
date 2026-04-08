"""Async retry with exponential backoff for transient LLM / API failures."""

from __future__ import annotations

import asyncio
import logging
import random
from functools import wraps
from typing import Any, Callable

logger = logging.getLogger(__name__)


def async_retry(
    max_retries: int = 2,
    backoff_base: float = 1.0,
    retryable_exceptions: tuple[type[BaseException], ...] = (Exception,),
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Decorator: retry an async function on transient failures.

    Delay formula: backoff_base * 2^attempt + U(0.0, 0.5) seconds.

    Args:
        max_retries:           Number of retries (total attempts = max_retries + 1).
        backoff_base:          Base delay in seconds (doubles each retry).
        retryable_exceptions:  Exception types to retry on (default: all).

    Example:
        @async_retry(max_retries=2, backoff_base=1.0)
        async def _call_llm(llm, messages):
            return await llm.ainvoke(messages)
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exc: BaseException | None = None
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except retryable_exceptions as exc:
                    last_exc = exc
                    if attempt < max_retries:
                        jitter = random.uniform(0.0, 0.5)
                        delay = backoff_base * (2**attempt) + jitter
                        logger.warning(
                            "[retry] %s — attempt %d/%d failed: %s. Retrying in %.1fs.",
                            func.__qualname__,
                            attempt + 1,
                            max_retries + 1,
                            exc,
                            delay,
                        )
                        await asyncio.sleep(delay)
            raise last_exc  # type: ignore[misc]

        return wrapper

    return decorator
