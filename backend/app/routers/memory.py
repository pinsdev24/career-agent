"""Memory router — View and manage user memories."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from supabase import AsyncClient

from app.dependencies import get_current_user, get_supabase_client
from app.memory.store import (
    get_all_user_memories,
    get_user_memory,
    upsert_user_memory,
)
from app.models.schemas import MemoryResponse, MemoryUpdate

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=list[MemoryResponse])
async def get_memories(
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> list[MemoryResponse]:
    """Get all memories for the current user."""
    rows = await get_all_user_memories(supabase, user["id"])
    return [
        MemoryResponse(
            memory_key=row["memory_key"], 
            memory_data=row["memory_data"],
            updated_at=row.get("updated_at")
        ) 
        for row in rows
    ]


@router.get("/{key}", response_model=MemoryResponse)
async def get_memory_by_key(
    key: str,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> MemoryResponse:
    """Get a specific memory by key."""
    row = await get_user_memory(supabase, user["id"], key)
    if row is None:
        return MemoryResponse(memory_key=key, memory_data={})
    return MemoryResponse(
        memory_key=row["memory_key"], 
        memory_data=row["memory_data"],
        updated_at=row.get("updated_at")
    )


@router.put("/{key}", response_model=MemoryResponse)
async def update_memory(
    key: str,
    data: MemoryUpdate,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> MemoryResponse:
    """Update a specific memory entry."""
    row = await upsert_user_memory(
        supabase=supabase,
        user_id=user["id"],
        memory_key=key,
        memory_data=data.memory_data,
    )
    return MemoryResponse(
        memory_key=key, 
        memory_data=row.get("memory_data", {}),
        updated_at=row.get("updated_at")
    )
