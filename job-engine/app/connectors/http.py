"""Shared HTTP client with retries."""

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential_jitter

from app.config import get_settings


def build_http_client() -> httpx.AsyncClient:
    """Create a pooled async HTTP client with default timeouts."""
    settings = get_settings()
    timeout = httpx.Timeout(settings.http_timeout_seconds)
    return httpx.AsyncClient(
        timeout=timeout,
        headers={"User-Agent": "MACA-JobEngine/0.1 (+https://github.com/maca)"},
        follow_redirects=True,
    )


class RetryableHTTPError(Exception):
    """Raised for retryable upstream failures."""


@retry(
    retry=retry_if_exception_type((RetryableHTTPError, httpx.TransportError)),
    wait=wait_exponential_jitter(initial=0.5, max=8),
    stop=stop_after_attempt(4),
    reraise=True,
)
async def get_json(
    client: httpx.AsyncClient,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    params: dict | None = None,
) -> tuple[dict | list, httpx.Headers, int]:
    """GET JSON with retries on 429/5xx. Returns (body, headers, status)."""
    response = await client.get(url, headers=headers, params=params)
    if response.status_code in (429, 500, 502, 503, 504):
        raise RetryableHTTPError(f"HTTP {response.status_code} for {url}")
    response.raise_for_status()
    if response.status_code == 304:
        return {}, response.headers, 304
    return response.json(), response.headers, response.status_code
