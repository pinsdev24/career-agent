"""Profile router — CV upload, parsing, preferences."""

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile

from app.config import Settings, get_settings
from app.dependencies import get_current_user, get_supabase_client
from app.exceptions import CVParsingError
from app.models.schemas import ProfilePreferencesUpdate, ProfileResponse
from app.rate_limit import rate_limit_cv_upload
from app.db.applications import insert_cv_version
from app.tools.cv_parser import parse_pdf, structure_cv
from app.tools.embedding_tools import chunk_and_embed
from app.tools.supabase_ops import get_profile, store_cv_embeddings, upsert_profile
from supabase import AsyncClient

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/cv", response_model=ProfileResponse)
async def upload_cv(
    file: Annotated[UploadFile, File(description="PDF file of the CV")],
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
    settings: Annotated[Settings, Depends(get_settings)],
    _rate_limit: Annotated[None, Depends(rate_limit_cv_upload)],
) -> ProfileResponse:
    """Upload and process a CV (PDF only).

    Steps:
    1. Extract raw text from PDF
    2. Structure the CV using LLM
    3. Chunk and embed CV sections
    4. Store everything in Supabase
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise CVParsingError("Only PDF files are accepted")

    if file.content_type not in {"application/pdf", "application/x-pdf"}:
        raise CVParsingError("Only PDF files are accepted")

    content = await file.read(settings.max_cv_upload_bytes + 1)
    if not content:
        raise CVParsingError("Empty file")
    if len(content) > settings.max_cv_upload_bytes:
        max_mb = settings.max_cv_upload_bytes / (1024 * 1024)
        raise CVParsingError(f"PDF is too large; maximum size is {max_mb:.0f} MB")
    if not content.startswith(b"%PDF"):
        raise CVParsingError("Uploaded file is not a valid PDF")

    logger.info("Processing CV for user %s", user["id"])

    # Step 1: extract raw text
    raw_text = parse_pdf(
        content,
        max_pages=settings.max_cv_pdf_pages,
        max_text_chars=settings.max_cv_text_chars,
    )
    if not raw_text.strip():
        raise CVParsingError("Could not extract text from the PDF")

    # Step 2: structure via LLM
    structured = await structure_cv(raw_text)

    # Step 3: chunk and embed
    embeddings = await chunk_and_embed(raw_text)

    # Step 4: persist
    profile = await upsert_profile(
        supabase=supabase,
        user_id=user["id"],
        cv_raw_text=raw_text,
        cv_structured=structured,
    )

    await store_cv_embeddings(
        supabase=supabase,
        user_id=user["id"],
        embeddings=embeddings,
    )

    storage_path = None
    try:
        version_id = str(uuid.uuid4())
        storage_path = f"{user['id']}/{version_id}.pdf"
        await supabase.storage.from_("cvs").upload(
            storage_path,
            content,
            {"content-type": "application/pdf"},
        )
    except Exception as exc:
        logger.warning("CV storage upload failed for user %s: %s", user["id"], exc)
        storage_path = None

    try:
        version = await insert_cv_version(
            supabase,
            user_id=user["id"],
            raw_text=raw_text,
            structured=structured,
            storage_path=storage_path,
        )
        await supabase.table("profiles").update(
            {"active_cv_version_id": version["id"]}
        ).eq("id", user["id"]).execute()
    except Exception as exc:
        logger.warning("CV version row failed for user %s: %s", user["id"], exc)

    logger.info("CV processed successfully for user %s", user["id"])
    return ProfileResponse(**profile)


@router.put("/preferences", response_model=ProfileResponse)
async def update_preferences(
    data: ProfilePreferencesUpdate,
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> ProfileResponse:
    """Update search preferences and tone of voice."""
    update_data: dict = {}
    if data.tone_of_voice is not None:
        update_data["tone_of_voice"] = data.tone_of_voice.value
    if data.language_preference is not None:
        update_data["language_preference"] = data.language_preference.value
    if data.search_preferences is not None:
        update_data["search_preferences"] = data.search_preferences.model_dump(
            exclude_none=True,
        )

    result = await supabase.table("profiles").update(update_data).eq(
        "id", user["id"]
    ).execute()

    profile = result.data[0] if result.data else {}
    return ProfileResponse(**profile)


@router.get("", response_model=ProfileResponse)
async def get_user_profile(
    user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> ProfileResponse:
    """Get the current user's profile."""
    profile = await get_profile(supabase=supabase, user_id=user["id"])
    return ProfileResponse(**profile)
