"""Cut 2 URL seed — upsert an ATS board from a pasted job/board URL."""

from app.db.repository import JobRepository
from app.logging_setup import get_logger
from app.quality.urls import (
    SEEDABLE_ATS_PROVIDERS,
    ats_careers_url,
    extract_ats_board_slug,
)

logger = get_logger(__name__)


async def seed_company_from_url(repo: JobRepository, url: str) -> dict:
    """Idempotent company upsert from a Greenhouse/Lever/Ashby/Workable URL.

    Non-ATS / unknown URLs return ``ok=False`` and do not insert a row.
    """
    parsed = extract_ats_board_slug(url)
    if not parsed or parsed[0] not in SEEDABLE_ATS_PROVIDERS:
        logger.info("url_seed_rejected", url=(url or "")[:120], reason="not_ats")
        return {"ok": False, "reason": "not_ats"}

    provider, slug = parsed
    existing = await repo.get_company_by_board(provider, slug)
    name = (existing or {}).get("name") or slug.replace("-", " ").replace("_", " ").replace(".", " ").title()
    row = await repo.upsert_company(
        slug=slug,
        name=name,
        ats_provider=provider,
        board_token=slug,
        careers_url=ats_careers_url(provider, slug) or (url or "").strip() or None,
        is_active=True,
    )
    company_id = str(row.get("id") or (existing or {}).get("id") or "")
    if not company_id:
        fetched = await repo.get_company_by_board(provider, slug)
        company_id = str((fetched or {}).get("id") or "")
    created = existing is None
    logger.info(
        "url_seed_upserted",
        provider=provider,
        slug=slug,
        company_id=company_id,
        created=created,
    )
    return {
        "ok": True,
        "provider": provider,
        "slug": slug,
        "company_id": company_id,
        "created": created,
        "name": name,
    }
