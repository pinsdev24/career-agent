import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.dependencies import create_supabase_client
from app.exceptions import CareerAgentError
from app.routers import hitl, memory, pipeline, profile

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — create shared resources on startup, clean up on shutdown."""
    settings = get_settings()
    logger.info("Starting CareerAgent backend")

    # Create Supabase client once and store on app.state
    app.state.supabase = await create_supabase_client(settings)
    logger.info("Supabase client initialized")

    yield

    logger.info("Shutting down CareerAgent backend")



app = FastAPI(
    title="CareerAgent API",
    description="Multi-Agent LLM Job Application Assistant",
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# NOTE: For this PoC we allow all origins so that 401/422 error responses
# also include the CORS header. In production, restrict to FRONTEND_URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------


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
        headers={"Access-Control-Allow-Origin": "*"},
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(pipeline.router, prefix="/pipeline", tags=["Pipeline"])
app.include_router(hitl.router, prefix="/hitl", tags=["HITL"])
app.include_router(memory.router, prefix="/memory", tags=["Memory"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}
