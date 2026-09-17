"""Database repository for job catalog operations."""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from supabase import AsyncClient

from app.logging_setup import get_logger
from app.models.schemas import CanonicalJob, JobPostingOut, ScoreBreakdown
from app.normalize.posting import fingerprint

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
    ) -> dict:
        payload = {
            "slug": slug.lower(),
            "name": name,
            "ats_provider": ats_provider,
            "board_token": board_token,
            "careers_url": careers_url,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        result = await (
            self.db.table("companies")
            .upsert(payload, on_conflict="ats_provider,board_token")
            .execute()
        )
        return (result.data or [payload])[0]

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
            row = {
                "source": job.source.value,
                "external_id": job.external_id,
                "company_id": company_id,
                "company_slug": job.company_slug,
                "company_name": job.company_name,
                "title": job.title,
                "location": job.location,
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
    ) -> list[dict]:
        result = await self.db.rpc(
            "match_job_postings",
            {
                "query_embedding": embedding,
                "match_count": match_count,
                "match_threshold": 0.05,
                "filter_remote": filter_remote,
                "filter_location": filter_location,
                "filter_contract": filter_contract,
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
    ) -> list[dict]:
        result = await self.db.rpc(
            "search_job_postings_hybrid",
            {
                "query_text": query_text,
                "query_embedding": embedding,
                "match_count": match_count,
                "filter_remote": filter_remote,
                "filter_location": filter_location,
                "filter_contract": filter_contract,
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
    ) -> list[dict]:
        """Tokenized ILIKE search over title/company/location/description."""
        tokens = _query_tokens(query)

        def _base():
            q = (
                self.db.table("job_postings")
                .select("*")
                .eq("status", "active")
                .order("posted_at", desc=True)
                .limit(limit)
            )
            if filter_remote is not None:
                q = q.eq("remote", filter_remote)
            if filter_location:
                q = q.ilike("location", f"%{filter_location}%")
            if filter_contract:
                q = q.ilike("contract_type", f"%{filter_contract}%")
            return q

        if not tokens:
            result = await _base().execute()
            return result.data or []

        # Prefer full-phrase match, then per-token OR across key fields.
        phrase = " ".join(tokens)
        clauses = [
            f"title.ilike.%{phrase}%",
            f"company_name.ilike.%{phrase}%",
            f"description_text.ilike.%{phrase}%",
        ]
        for token in tokens:
            clauses.extend(
                [
                    f"title.ilike.%{token}%",
                    f"company_name.ilike.%{token}%",
                    f"location.ilike.%{token}%",
                    f"description_text.ilike.%{token}%",
                ]
            )

        result = await _base().or_(",".join(clauses)).execute()
        rows = result.data or []

        # If phrase/token OR returned nothing (odd PostgREST edge), return recent active.
        if not rows:
            fallback = await _base().execute()
            rows = fallback.data or []
        return rows

    async def list_recent_active(
        self,
        *,
        limit: int = 80,
        filter_remote: bool | None = None,
        filter_location: str | None = None,
        filter_contract: str | None = None,
    ) -> list[dict]:
        q = (
            self.db.table("job_postings")
            .select("*")
            .eq("status", "active")
            .order("posted_at", desc=True)
            .limit(limit)
        )
        if filter_remote is not None:
            q = q.eq("remote", filter_remote)
        if filter_location:
            q = q.ilike("location", f"%{filter_location}%")
        if filter_contract:
            q = q.ilike("contract_type", f"%{filter_contract}%")
        result = await q.execute()
        return result.data or []

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
    return JobPostingOut(
        id=UUID(row["id"]),
        source=row["source"],
        external_id=row["external_id"],
        company_name=row["company_name"],
        company_slug=row.get("company_slug"),
        title=row["title"],
        location=row.get("location"),
        remote=row.get("remote"),
        contract_type=row.get("contract_type"),
        salary=row.get("salary"),
        description_text=row.get("description_text"),
        apply_url=row["apply_url"],
        skills=skills,
        status=row["status"],
        posted_at=row.get("posted_at"),
        last_seen_at=row.get("last_seen_at"),
        score=score,
        score_breakdown=breakdown,
    )
