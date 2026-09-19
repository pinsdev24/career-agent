"""Database repository for job catalog operations."""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from supabase import AsyncClient

from app.logging_setup import get_logger
from app.models.schemas import CanonicalJob, JobPostingOut, ScoreBreakdown
from app.normalize.posting import fingerprint
from app.quality.display import clean_job_title, display_company
from app.rank.countries import parse_posting_location
from app.rank.filters import CatalogFilters, row_matches_structured
from app.rank.geo import expand_location_aliases, location_rpc_filter

logger = get_logger(__name__)


def _query_tokens(query: str) -> list[str]:
    """Split a user query into searchable tokens (drop tiny noise)."""
    raw = [t.strip() for t in (query or "").replace(",", " ").split() if t.strip()]
    tokens: list[str] = []
    for t in raw:
        # Keep short tech tokens like "AI", "ML", "Go"
        if len(t) >= 2 or t.isupper():
            tokens.append(t)
    # de-dupe preserving order
    seen: set[str] = set()
    out: list[str] = []
    for t in tokens:
        key = t.lower()
        if key not in seen:
            seen.add(key)
            out.append(t)
    return out[:8]


def _row_matches_tokens(row: dict, tokens: list[str]) -> bool:
    blob = " ".join(
        [
            str(row.get("title") or ""),
            str(row.get("company_name") or ""),
            str(row.get("location") or ""),
            str(row.get("description_text") or "")[:4000],
        ]
    ).lower()
    return any(token.lower() in blob for token in tokens)


def country_code_or_clause(codes: list[str]) -> str:
    """PostgREST OR: selected ISO codes *or* unknown (NULL) country_code.

    ``IN (...)`` alone drops NULL rows, which emptied recommend after Cut 3a
    when migration 007 left many postings uncoded.
    """
    joined = ",".join(codes)
    return f"country_code.in.({joined}),country_code.is.null"


def apply_catalog_filters(
    q,
    *,
    filter_remote: bool | None = None,
    filter_location: str | None = None,
    filter_contract: str | None = None,
    filter_countries: list[str] | None = None,
):
    """Apply location/remote/country filters in SQL.

    Country codes are the Cut 3 hard geo gate. Unknown (NULL) codes stay in
    recall; Python ``row_matches_structured`` still excludes a *known* country
    outside the selected ISO set (Argentina stays out of a BE filter). Location
    aliases remain as a recall hint only when no country codes are available.
    Remote=false is *not* encoded here (``or`` would collide); callers also run
    ``row_matches_filters``.
    """
    if filter_remote is True:
        q = q.eq("remote", True)
    codes = [c.upper() for c in (filter_countries or []) if c and len(c) == 2]
    if codes:
        q = q.or_(country_code_or_clause(codes))
    else:
        aliases = expand_location_aliases(filter_location)
        if aliases:
            clause = ",".join(f"location.ilike.%{alias}%" for alias in aliases)
            q = q.or_(clause)
    if filter_contract:
        q = q.ilike("contract_type", f"%{filter_contract}%")
    return q


def row_matches_filters(
    row: dict,
    *,
    filter_remote: bool | None = None,
    filter_location: str | None = None,
    filter_contract: str | None = None,
    filter_countries: list[str] | None = None,
    filter_work_modes: list[str] | None = None,
    filter_contract_types: list[str] | None = None,
    filter_roles: list[str] | None = None,
    filters: CatalogFilters | None = None,
) -> bool:
    """Honest post-filter so geo/remote/role prefs cannot be silently dropped."""
    if filters is None:
        from app.models.prefs import parse_contract_types, parse_work_modes

        filters = CatalogFilters(
            countries=[c.upper() for c in (filter_countries or []) if c],
            work_modes=parse_work_modes(filter_work_modes),
            contract_types=parse_contract_types(filter_contract_types),
            roles=list(filter_roles or []),
            location=filter_location,
            remote=filter_remote,
            contract=filter_contract,
        )
    return row_matches_structured(row, filters)


class JobRepository:
    """Supabase-backed catalog repository."""

    def __init__(self, supabase: AsyncClient):
        self.db = supabase

    async def list_active_companies(self) -> list[dict]:
        result = await (
            self.db.table("companies")
            .select("*")
            .eq("is_active", True)
            .execute()
        )
        return result.data or []

    async def list_companies(self, *, active_only: bool = False) -> list[dict]:
        q = self.db.table("companies").select("*")
        if active_only:
            q = q.eq("is_active", True)
        result = await q.execute()
        return result.data or []

    async def get_company(self, company_id: str) -> dict | None:
        result = await (
            self.db.table("companies")
            .select("*")
            .eq("id", company_id)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None

    async def get_company_by_board(
        self, ats_provider: str, board_token: str
    ) -> dict | None:
        result = await (
            self.db.table("companies")
            .select("*")
            .eq("ats_provider", ats_provider)
            .eq("board_token", board_token)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None

    async def count_active_companies(self) -> int:
        result = await (
            self.db.table("companies")
            .select("id", count="exact")
            .eq("is_active", True)
            .execute()
        )
        return result.count or 0

    async def deactivate_company(self, company_id: str, *, reason: str) -> None:
        await (
            self.db.table("companies")
            .update(
                {
                    "is_active": False,
                    "inactive_reason": reason,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .eq("id", company_id)
            .execute()
        )
        logger.info("company_deactivated", company_id=company_id, reason=reason)

    async def record_company_sync_counts(
        self,
        company_id: str,
        *,
        consecutive_empty_syncs: int,
    ) -> None:
        await (
            self.db.table("companies")
            .update(
                {
                    "consecutive_empty_syncs": consecutive_empty_syncs,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .eq("id", company_id)
            .execute()
        )

    async def list_discovery_intents(self, limit: int = 40) -> list[dict]:
        """Profiles that have a target title and/or location — discovery demand."""
        result = await (
            self.db.table("profiles")
            .select("id, search_preferences, cv_structured")
            .limit(limit)
            .execute()
        )
        rows = []
        for row in result.data or []:
            prefs = row.get("search_preferences") or {}
            if not isinstance(prefs, dict):
                continue
            title = (prefs.get("job_title") or "").strip()
            location = (prefs.get("location") or "").strip()
            countries = prefs.get("countries") or []
            roles = prefs.get("preferred_roles") or []
            if title or location or countries or roles:
                rows.append(row)
        return rows

    async def count_active_jobs(self) -> int:
        result = await (
            self.db.table("job_postings")
            .select("id", count="exact")
            .eq("status", "active")
            .execute()
        )
        return result.count or 0

    async def upsert_company(
        self,
        *,
        slug: str,
        name: str,
        ats_provider: str,
        board_token: str,
        careers_url: str | None = None,
        is_active: bool | None = None,
    ) -> dict:
        payload = {
            "slug": slug.lower(),
            "name": name,
            "ats_provider": ats_provider,
            "board_token": board_token,
            "careers_url": careers_url,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if is_active is not None:
            payload["is_active"] = is_active
            if is_active:
                payload["inactive_reason"] = None
        result = await (
            self.db.table("companies")
            .upsert(payload, on_conflict="ats_provider,board_token")
            .execute()
        )
        row = (result.data or [payload])[0]
        if not row.get("id"):
            fetched = await (
                self.db.table("companies")
                .select("*")
                .eq("ats_provider", ats_provider)
                .eq("board_token", board_token)
                .limit(1)
                .execute()
            )
            if fetched.data:
                row = fetched.data[0]
        return row

    async def update_company_sync(
        self,
        company_id: str,
        *,
        etag: str | None,
    ) -> None:
        await (
            self.db.table("companies")
            .update(
                {
                    "etag": etag,
                    "synced_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .eq("id", company_id)
            .execute()
        )

    async def upsert_jobs(
        self,
        jobs: list[CanonicalJob],
        *,
        company_id: str | None = None,
    ) -> tuple[list[str], int]:
        """Upsert jobs; return (changed_job_ids needing embed, skipped_count)."""
        if not jobs:
            return [], 0

        now = datetime.now(timezone.utc).isoformat()
        changed_ids: list[str] = []
        skipped = 0

        # Prefetch existing hashes for this batch
        external_ids = [j.external_id for j in jobs]
        source = jobs[0].source.value
        existing_map: dict[str, dict] = {}
        # chunk to avoid huge IN filters
        for i in range(0, len(external_ids), 100):
            chunk = external_ids[i : i + 100]
            existing = await (
                self.db.table("job_postings")
                .select("id, external_id, content_hash")
                .eq("source", source)
                .in_("external_id", chunk)
                .execute()
            )
            for row in existing.data or []:
                existing_map[row["external_id"]] = row

        rows_to_upsert: list[dict] = []
        for job in jobs:
            fp = fingerprint(job.company_slug, job.title, job.location)
            prev = existing_map.get(job.external_id)
            unchanged = bool(prev and prev.get("content_hash") == job.content_hash)
            loc = job.location
            parsed = parse_posting_location(loc)
            row = {
                "source": job.source.value,
                "external_id": job.external_id,
                "company_id": company_id,
                "company_slug": job.company_slug,
                "company_name": job.company_name,
                "title": job.title,
                "location": loc,
                "country_code": job.country_code or parsed.country_code,
                "city": job.city or parsed.city,
                "remote": job.remote,
                "contract_type": job.contract_type,
                "salary": job.salary,
                "description_text": job.description_text,
                "apply_url": job.apply_url,
                "skills": job.skills,
                "status": "active",
                "posted_at": job.posted_at.isoformat() if job.posted_at else None,
                "last_seen_at": now,
                "content_hash": job.content_hash,
                "fingerprint": fp,
                "raw": job.raw,
                "updated_at": now,
                "embed_pending": not unchanged,
            }
            if unchanged:
                skipped += 1
            rows_to_upsert.append(row)

        # Batch upsert
        for i in range(0, len(rows_to_upsert), 50):
            batch = rows_to_upsert[i : i + 50]
            result = await (
                self.db.table("job_postings")
                .upsert(batch, on_conflict="source,external_id")
                .execute()
            )
            for saved in result.data or []:
                if saved.get("embed_pending"):
                    changed_ids.append(saved["id"])

        return changed_ids, skipped

    async def expire_missing(
        self,
        *,
        company_id: str,
        source: str,
        seen_external_ids: set[str],
    ) -> int:
        """Mark active company jobs not in seen set as expired."""
        active = await (
            self.db.table("job_postings")
            .select("id, external_id")
            .eq("company_id", company_id)
            .eq("source", source)
            .eq("status", "active")
            .execute()
        )
        to_expire = [
            row["id"]
            for row in (active.data or [])
            if row["external_id"] not in seen_external_ids
        ]
        if not to_expire:
            return 0
        now = datetime.now(timezone.utc).isoformat()
        for i in range(0, len(to_expire), 100):
            await (
                self.db.table("job_postings")
                .update({"status": "expired", "updated_at": now})
                .in_("id", to_expire[i : i + 100])
                .execute()
            )
        return len(to_expire)

    async def start_ingest_run(self, source: str, company_slug: str | None = None) -> str:
        result = await (
            self.db.table("job_ingest_runs")
            .insert({"source": source, "company_slug": company_slug})
            .execute()
        )
        return result.data[0]["id"]

    async def finish_ingest_run(
        self,
        run_id: str,
        *,
        upserted: int = 0,
        expired: int = 0,
        skipped: int = 0,
        errors: list | None = None,
        meta: dict | None = None,
    ) -> None:
        await (
            self.db.table("job_ingest_runs")
            .update(
                {
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "upserted": upserted,
                    "expired": expired,
                    "skipped": skipped,
                    "errors": errors or [],
                    "meta": meta or {},
                }
            )
            .eq("id", run_id)
            .execute()
        )

    async def list_pending_embed(self, limit: int = 50) -> list[dict]:
        result = await (
            self.db.table("job_postings")
            .select("id, title, company_name, description_text, location, skills")
            .eq("embed_pending", True)
            .eq("status", "active")
            .limit(limit)
            .execute()
        )
        return result.data or []

    async def store_embedding(self, job_id: str, chunk_text: str, embedding: list[float]) -> None:
        await (
            self.db.table("job_posting_embeddings")
            .delete()
            .eq("job_id", job_id)
            .execute()
        )
        await (
            self.db.table("job_posting_embeddings")
            .insert(
                {
                    "job_id": job_id,
                    "chunk_text": chunk_text[:8000],
                    "chunk_type": "full",
                    "embedding": embedding,
                }
            )
            .execute()
        )
        await (
            self.db.table("job_postings")
            .update({"embed_pending": False})
            .eq("id", job_id)
            .execute()
        )

    async def stale_active_jobs(self, older_than_iso: str, limit: int = 100) -> list[dict]:
        result = await (
            self.db.table("job_postings")
            .select("id, apply_url, source, external_id, company_slug")
            .eq("status", "active")
            .lt("last_seen_at", older_than_iso)
            .limit(limit)
            .execute()
        )
        return result.data or []

    async def mark_expired(self, job_ids: list[str]) -> None:
        if not job_ids:
            return
        await (
            self.db.table("job_postings")
            .update(
                {
                    "status": "expired",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .in_("id", job_ids)
            .execute()
        )

    async def touch_last_seen(self, job_ids: list[str]) -> None:
        if not job_ids:
            return
        await (
            self.db.table("job_postings")
            .update({"last_seen_at": datetime.now(timezone.utc).isoformat()})
            .in_("id", job_ids)
            .execute()
        )

    async def get_job(self, job_id: str) -> dict | None:
        result = await (
            self.db.table("job_postings")
            .select("*")
            .eq("id", job_id)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None

    async def get_jobs_by_ids(self, job_ids: list[str]) -> list[dict]:
        if not job_ids:
            return []
        out: list[dict] = []
        for i in range(0, len(job_ids), 100):
            result = await (
                self.db.table("job_postings")
                .select("*")
                .in_("id", job_ids[i : i + 100])
                .execute()
            )
            out.extend(result.data or [])
        return out

    async def get_profile(self, user_id: str) -> dict | None:
        result = await (
            self.db.table("profiles")
            .select("id, cv_structured, search_preferences, cv_raw_text")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None

    async def get_cv_embedding(self, user_id: str) -> list[float] | None:
        result = await (
            self.db.table("cv_embeddings")
            .select("embedding")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        if not rows:
            return None
        return rows[0].get("embedding")

    async def get_user_signals(self, user_id: str) -> list[dict]:
        result = await (
            self.db.table("user_job_signals")
            .select("job_id, signal")
            .eq("user_id", user_id)
            .execute()
        )
        return result.data or []

    async def upsert_signal(self, user_id: str, job_id: str, signal: str) -> None:
        await (
            self.db.table("user_job_signals")
            .upsert(
                {"user_id": user_id, "job_id": job_id, "signal": signal},
                on_conflict="user_id,job_id,signal",
            )
            .execute()
        )

    async def match_job_postings_rpc(
        self,
        embedding: list[float],
        *,
        match_count: int = 50,
        filter_remote: bool | None = None,
        filter_location: str | None = None,
        filter_contract: str | None = None,
        filter_countries: list[str] | None = None,
    ) -> list[dict]:
        result = await self.db.rpc(
            "match_job_postings",
            {
                "query_embedding": embedding,
                "match_count": match_count,
                "match_threshold": 0.05,
                "filter_remote": filter_remote,
                "filter_location": location_rpc_filter(filter_location)
                if not filter_countries
                else None,
                "filter_contract": filter_contract,
                "filter_countries": "|".join(c.upper() for c in filter_countries)
                if filter_countries
                else None,
            },
        ).execute()
        return result.data or []

    async def hybrid_search_rpc(
        self,
        query_text: str,
        embedding: list[float],
        *,
        match_count: int = 50,
        filter_remote: bool | None = None,
        filter_location: str | None = None,
        filter_contract: str | None = None,
        filter_countries: list[str] | None = None,
    ) -> list[dict]:
        result = await self.db.rpc(
            "search_job_postings_hybrid",
            {
                "query_text": query_text,
                "query_embedding": embedding,
                "match_count": match_count,
                "filter_remote": filter_remote,
                "filter_location": location_rpc_filter(filter_location)
                if not filter_countries
                else None,
                "filter_contract": filter_contract,
                "filter_countries": "|".join(c.upper() for c in filter_countries)
                if filter_countries
                else None,
            },
        ).execute()
        return result.data or []

    async def search_lexical(
        self,
        query: str,
        *,
        limit: int = 80,
        filter_remote: bool | None = None,
        filter_location: str | None = None,
        filter_contract: str | None = None,
        filter_countries: list[str] | None = None,
        filter_work_modes: list[str] | None = None,
        filter_contract_types: list[str] | None = None,
        filter_roles: list[str] | None = None,
    ) -> list[dict]:
        """Tokenized ILIKE search over title/company/location/description."""
        tokens = _query_tokens(query)

        def _base(fetch_limit: int):
            q = (
                self.db.table("job_postings")
                .select("*")
                .eq("status", "active")
                .order("posted_at", desc=True)
                .limit(fetch_limit)
            )
            return apply_catalog_filters(
                q,
                filter_remote=filter_remote,
                filter_location=filter_location,
                filter_contract=filter_contract,
                filter_countries=filter_countries,
            )

        fetch_limit = max(limit, 80)
        if tokens:
            fetch_limit = max(limit * 3, 120)
        result = await _base(fetch_limit).execute()
        rows = result.data or []
        matched: list[dict] = []
        for row in rows:
            if not row_matches_filters(
                row,
                filter_remote=filter_remote,
                filter_location=filter_location,
                filter_contract=filter_contract,
                filter_countries=filter_countries,
                filter_work_modes=filter_work_modes,
                filter_contract_types=filter_contract_types,
                filter_roles=filter_roles,
            ):
                continue
            if tokens and not _row_matches_tokens(row, tokens):
                continue
            matched.append(row)
            if len(matched) >= limit:
                break
        return matched

    async def list_recent_active(
        self,
        *,
        limit: int = 80,
        filter_remote: bool | None = None,
        filter_location: str | None = None,
        filter_contract: str | None = None,
        filter_countries: list[str] | None = None,
        filter_work_modes: list[str] | None = None,
        filter_contract_types: list[str] | None = None,
        filter_roles: list[str] | None = None,
    ) -> list[dict]:
        q = (
            self.db.table("job_postings")
            .select("*")
            .eq("status", "active")
            .order("posted_at", desc=True)
            .limit(limit)
        )
        q = apply_catalog_filters(
            q,
            filter_remote=filter_remote,
            filter_location=filter_location,
            filter_contract=filter_contract,
            filter_countries=filter_countries,
        )
        result = await q.execute()
        return [
            row
            for row in (result.data or [])
            if row_matches_filters(
                row,
                filter_remote=filter_remote,
                filter_location=filter_location,
                filter_contract=filter_contract,
                filter_countries=filter_countries,
                filter_work_modes=filter_work_modes,
                filter_contract_types=filter_contract_types,
                filter_roles=filter_roles,
            )
        ]

    async def backfill_country_codes(self, *, limit: int = 500) -> int:
        """Fill country_code/city for existing postings that still lack a code."""
        result = await (
            self.db.table("job_postings")
            .select("id, location, country_code, city")
            .is_("country_code", "null")
            .limit(limit)
            .execute()
        )
        updated = 0
        for row in result.data or []:
            parsed = parse_posting_location(row.get("location"))
            if not parsed.country_code and not parsed.city:
                continue
            payload: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
            if parsed.country_code:
                payload["country_code"] = parsed.country_code
            if parsed.city:
                payload["city"] = parsed.city
            await (
                self.db.table("job_postings")
                .update(payload)
                .eq("id", row["id"])
                .execute()
            )
            updated += 1
        return updated

    async def ingest_stats(self) -> dict[str, Any]:
        runs = await (
            self.db.table("job_ingest_runs")
            .select("*")
            .order("started_at", desc=True)
            .limit(20)
            .execute()
        )
        active = await (
            self.db.table("job_postings")
            .select("id", count="exact")
            .eq("status", "active")
            .execute()
        )
        companies = await (
            self.db.table("companies")
            .select("id", count="exact")
            .eq("is_active", True)
            .execute()
        )
        return {
            "recent_runs": runs.data or [],
            "active_jobs": active.count or 0,
            "companies": companies.count or 0,
        }


def row_to_job_out(
    row: dict,
    score: float | None = None,
    breakdown: ScoreBreakdown | None = None,
) -> JobPostingOut:
    """Map DB row to API model."""
    skills = row.get("skills") or []
    if isinstance(skills, str):
        skills = []
    apply_url = row["apply_url"]
    company = display_company(
        row.get("company_name"),
        company_slug=row.get("company_slug"),
        apply_url=apply_url,
    ) or (row.get("company_name") or "")
    title = clean_job_title(row.get("title") or "", company) or (row.get("title") or "")
    return JobPostingOut(
        id=UUID(row["id"]),
        source=row["source"],
        external_id=row["external_id"],
        company_name=company,
        company_slug=row.get("company_slug"),
        title=title,
        location=row.get("location"),
        country_code=row.get("country_code"),
        city=row.get("city"),
        remote=row.get("remote"),
        contract_type=row.get("contract_type"),
        salary=row.get("salary"),
        description_text=row.get("description_text"),
        apply_url=apply_url,
        skills=skills,
        status=row["status"],
        posted_at=row.get("posted_at"),
        last_seen_at=row.get("last_seen_at"),
        score=score,
        score_breakdown=breakdown,
    )
