"""Job Engine FastAPI application."""

import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app.api.v1 import api_router
from app.config import get_settings
from app.dependencies import create_redis_client, create_supabase_client
from app.logging_setup import get_logger, setup_logging
from app.metrics import REQUEST_COUNT, REQUEST_LATENCY, metrics_payload

setup_logging()
logger = get_logger(__name__)


def _cors_origins() -> list[str]:
    """Explicit browser origins (avoid * + Authorization edge cases)."""
    settings = get_settings()
    origins = {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        settings.frontend_url.rstrip("/"),
    }
    return sorted(o for o in origins if o)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    logger.info("starting", service=settings.service_name, redis_url=settings.redis_url)
    app.state.supabase = await create_supabase_client(settings)
    app.state.redis = await create_redis_client(settings)
    # Fail soft — cache is optional for API correctness
    try:
        await app.state.redis.ping()
        logger.info("redis_connected")
    except Exception as exc:
        logger.warning("redis_unavailable_at_startup", error=str(exc))
    yield
    try:
        await app.state.redis.aclose()
    except Exception:
        pass
    logger.info("stopped", service=settings.service_name)


app = FastAPI(
    title="MACA Job Engine",
    description="Personalized job catalog and recommendations",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Ensure error responses still carry CORS for browser clients."""
    logger.exception("unhandled_error", path=str(request.url.path), error=str(exc))
    origin = request.headers.get("origin")
    headers: dict[str, str] = {}
    allowed = _cors_origins()
    if origin and (
        origin in allowed
        or origin.startswith("http://localhost:")
        or origin.startswith("http://127.0.0.1:")
    ):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Vary"] = "Origin"
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )


@app.middleware("http")
async def request_metrics(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        # Let the exception handler format the body; still record metrics.
        REQUEST_COUNT.labels(request.method, request.url.path, "500").inc()
        raise exc
    elapsed = time.perf_counter() - start
    path = request.url.path
    label_path = path
    if path.startswith("/v1/jobs/") and path.count("/") >= 3:
        parts = path.split("/")
        if len(parts) >= 4 and parts[3] not in ("recommend", "search"):
            label_path = "/v1/jobs/{id}" + ("/signals" if path.endswith("/signals") else "")
    REQUEST_COUNT.labels(request.method, label_path, str(response.status_code)).inc()
    REQUEST_LATENCY.labels(request.method, label_path).observe(elapsed)
    response.headers["X-Request-Id"] = request_id
    return response


app.include_router(api_router)


@app.get("/metrics")
async def metrics() -> Response:
    payload, content_type = metrics_payload()
    return Response(content=payload, media_type=content_type)


@app.get("/")
async def root() -> dict:
    return {"service": "job-engine", "docs": "/docs", "health": "/v1/health"}
