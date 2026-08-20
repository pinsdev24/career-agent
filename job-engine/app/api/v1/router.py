"""Legacy module path — prefer `from app.api.v1 import api_router`."""

from app.api.v1.admin import router as admin_router
from app.api.v1.health import router as health_router
from app.api.v1.jobs import router as jobs_router
from fastapi import APIRouter

api_router = APIRouter(prefix="/v1")
api_router.include_router(health_router)
api_router.include_router(jobs_router)
api_router.include_router(admin_router)
