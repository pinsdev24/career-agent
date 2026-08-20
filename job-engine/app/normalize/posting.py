"""Canonical job posting helpers — hashing and fingerprinting."""

import hashlib
import re
from datetime import datetime

from app.models.schemas import AtsProvider, CanonicalJob
from app.normalize.url import canonicalize_url


def _normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def content_hash(
    title: str,
    company: str,
    description: str,
    location: str | None = None,
) -> str:
    """Stable hash of posting content for change detection."""
    payload = "|".join(
        [
            _normalize_ws(title).lower(),
            _normalize_ws(company).lower(),
            _normalize_ws(location or "").lower(),
            _normalize_ws(description).lower(),
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def fingerprint(company_slug: str | None, title: str, location: str | None) -> str:
    """Soft dedupe key across sources."""
    parts = [
        (company_slug or "").lower().strip(),
        _normalize_ws(title).lower(),
        _normalize_ws(location or "").lower(),
    ]
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def build_canonical_job(
    *,
    source: AtsProvider,
    external_id: str,
    company_name: str,
    title: str,
    description_text: str,
    apply_url: str,
    company_slug: str | None = None,
    location: str | None = None,
    remote: bool | None = None,
    contract_type: str | None = None,
    salary: str | None = None,
    skills: list[str] | None = None,
    posted_at: datetime | None = None,
    raw: dict | None = None,
) -> CanonicalJob:
    """Build a CanonicalJob with hash and canonical URL."""
    url = canonicalize_url(apply_url)
    desc = _normalize_ws(description_text)
    return CanonicalJob(
        source=source,
        external_id=str(external_id),
        company_slug=company_slug,
        company_name=_normalize_ws(company_name),
        title=_normalize_ws(title),
        location=_normalize_ws(location) if location else None,
        remote=remote,
        contract_type=contract_type,
        salary=salary,
        description_text=desc,
        apply_url=url,
        skills=skills or [],
        posted_at=posted_at,
        content_hash=content_hash(title, company_name, desc, location),
        raw=raw or {},
    )
