import logging
import re
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import redis.asyncio as redis
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError as PostgrestAPIError

from app.config import get_settings
from app.dependencies import create_supabase_client
from app.exceptions import CareerAgentError
from app.graph.pubsub import configure_log_redis
from app.rate_limit import configure_rate_limit_redis
from app.routers import applications, hitl, memory, pipeline, profile
from app.workers import close_arq_pool

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


def _cors_origins() -> list[str]:
    settings = get_settings()
    origins = {
        settings.frontend_url.rstrip("/"),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
    return sorted(o for o in origins if o)


_LOCAL_ORIGIN = r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?"
_LOCAL_ORIGIN_RE = re.compile(_LOCAL_ORIGIN)


def _cors_headers_for(request: Request) -> dict[str, str]:
    origin = request.headers.get("origin")
    if not origin:
        return {}
    if origin in _cors_origins() or _LOCAL_ORIGIN_RE.fullmatch(origin):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin",
        }
    return {}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — create shared resources on startup, clean up on shutdown."""
    settings = get_settings()
    logger.info("Starting CareerAgent backend")

    app.state.supabase = await create_supabase_client(settings)
    logger.info("Supabase client initialized")

    app.state.redis = None
    if settings.redis_url:
        client = redis.from_url(settings.redis_url, decode_responses=True)
        try:
            await client.ping()
            app.state.redis = client
            configure_log_redis(client)
            configure_rate_limit_redis(client)
            logger.info("Redis connected")
        except Exception as exc:
            await client.aclose()
            if settings.require_redis:
                raise
            logger.warning("Redis unavailable at startup: %s", exc)
    elif settings.require_redis:
        raise RuntimeError("REDIS_URL is required")

    yield

    if app.state.redis is not None:
        await app.state.redis.aclose()
    await close_arq_pool()
    logger.info("Shutting down CareerAgent backend")


app = FastAPI(
    title="CareerAgent API",
    description="Multi-Agent LLM Job Application Assistant",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=_LOCAL_ORIGIN,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)


@app.middleware("http")
async def enforce_cv_upload_content_length(
    request: Request,
    call_next,
):
    """Reject obviously oversized CV uploads before multipart parsing."""
    if request.method == "POST" and request.url.path == "/profile/cv":
        settings = get_settings()
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                max_request_bytes = settings.max_cv_upload_bytes + 64 * 1024
                if int(content_length) > max_request_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "CV upload is too large"},
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header"},
                )

    return await call_next(request)


@app.exception_handler(CareerAgentError)
async def career_agent_error_handler(
    request: Request,
    exc: CareerAgentError,
) -> JSONResponse:
    """Handle all application-specific exceptions."""
    logger.error("CareerAgentError: %s (status=%d)", exc.message, exc.status_code)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
        headers=_cors_headers_for(request),
    )


@app.exception_handler(PostgrestAPIError)
async def postgrest_error_handler(
    request: Request,
    exc: PostgrestAPIError,
) -> JSONResponse:
    """Turn missing-schema / PostgREST crashes into a readable API error."""
    code = getattr(exc, "code", "") or ""
    message = getattr(exc, "message", None) or str(exc)
    logger.error("PostgREST error code=%s message=%s", code, message)
    if code == "PGRST205":
        detail = (
            "Required database tables are missing. "
            "Apply backend/supabase/migrations/005_job_os_applications.sql."
        )
        status_code = 503
    else:
        detail = "Database request failed"
        status_code = 502
    return JSONResponse(
        status_code=status_code,
        content={"detail": detail},
        headers=_cors_headers_for(request),
    )


app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(pipeline.router, prefix="/pipeline", tags=["Pipeline"])
app.include_router(hitl.router, prefix="/hitl", tags=["HITL"])
app.include_router(memory.router, prefix="/memory", tags=["Memory"])
app.include_router(applications.router, prefix="/applications", tags=["Applications"])


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
async def ready(request: Request) -> JSONResponse:
    """Readiness: Supabase required, Redis required when configured."""
    settings = get_settings()
    supabase_ok = False
    redis_ok = False
    try:
        supabase = request.app.state.supabase
        await supabase.table("profiles").select("id").limit(1).execute()
        supabase_ok = True
    except Exception as exc:
        logger.warning("ready: supabase check failed: %s", exc)

    redis_client = getattr(request.app.state, "redis", None)
    if redis_client is not None:
        try:
            redis_ok = bool(await redis_client.ping())
        except Exception:
            redis_ok = False
    elif not settings.redis_url:
        redis_ok = True

    ok = supabase_ok and redis_ok
    return JSONResponse(
        status_code=200 if ok else 503,
        content={"status": "ok" if ok else "degraded", "supabase": supabase_ok, "redis": redis_ok},
    )
