"""Personalized ranking and hybrid retrieval."""

from __future__ import annotations

import base64
import hashlib
import json
import math
import re
from datetime import datetime, timezone
from typing import Any

from app.config import Settings, get_settings
from app.db.embeddings import embed_text_or_none
from app.db.repository import JobRepository, _query_tokens, row_to_job_out
from app.logging_setup import get_logger
from app.models.schemas import JobListResponse, JobPostingOut, ScoreBreakdown

logger = get_logger(__name__)

SOURCE_TRUST = {
    "greenhouse": 1.0,
    "lever": 1.0,
    "ashby": 1.0,
    "workable": 0.95,
    "tavily": 0.7,
}


def _query_relevance(query: str, job: dict) -> tuple[float, list[str]]:
    """Score how well a job matches the explicit search query (0..1)."""
    tokens = [t.lower() for t in _query_tokens(query)]
    if not tokens:
        return 0.0, []

    title = (job.get("title") or "").lower()
    company = (job.get("company_name") or "").lower()
    location = (job.get("location") or "").lower()
    desc = (job.get("description_text") or "").lower()
    blob = f"{title} {company} {location} {desc}"

    reasons: list[str] = []
    phrase = " ".join(tokens)
    score = 0.0

    if phrase and phrase in title:
        score += 1.0
        reasons.append(f'Title contains "{phrase}"')
    elif phrase and phrase in blob:
        score += 0.7
        reasons.append(f'Matches "{phrase}"')

    hit = 0
    for token in tokens:
        if token in title:
            hit += 1
            score += 0.35
        elif token in company or token in location:
            hit += 1
            score += 0.2
        elif re.search(rf"\b{re.escape(token)}\b", desc):
            hit += 1
            score += 0.1

    if hit and not reasons:
        reasons.append(f"Matched {hit}/{len(tokens)} query terms")

    return min(score / max(1.0, 0.5 + 0.35 * len(tokens)), 1.0), reasons[:4]


class SearchIndex:
    """Port over Postgres hybrid search — always unions lexical + semantic."""

    def __init__(self, repo: JobRepository):
        self.repo = repo

    async def recall(
        self,
        *,
        query_text: str,
        embedding: list[float] | None,
        filter_remote: bool | None,
        filter_location: str | None,
        filter_contract: str | None,
        limit: int = 80,
    ) -> list[dict[str, Any]]:
        by_id: dict[str, dict[str, Any]] = {}

        # 1) Lexical / recent — always runs so search works without embeddings.
        try:
            if query_text.strip():
                lexical_rows = await self.repo.search_lexical(
                    query_text,
                    limit=limit,
                    filter_remote=filter_remote,
                    filter_location=filter_location,
                    filter_contract=filter_contract,
                )
            else:
                lexical_rows = await self.repo.list_recent_active(
                    limit=limit,
                    filter_remote=filter_remote,
                    filter_location=filter_location,
                    filter_contract=filter_contract,
                )
            for row in lexical_rows:
                by_id[row["id"]] = {
                    "job_id": row["id"],
                    "semantic_score": 0.0,
                    "lexical_score": 0.55,
                    "hybrid_score": 0.55,
                    "_row": row,
                }
        except Exception as exc:
            logger.warning("lexical_recall_failed", error=str(exc))

        # 2) Semantic / hybrid — best-effort enrichment.
        if embedding:
            try:
                hybrid = await self.repo.hybrid_search_rpc(
                    query_text,
                    embedding,
                    match_count=limit,
                    filter_remote=filter_remote,
                    filter_location=filter_location,
                    filter_contract=filter_contract,
                )
                if not hybrid:
                    hybrid = [
                        {
                            "job_id": r["job_id"],
                            "semantic_score": r.get("similarity", 0),
                            "lexical_score": 0,
                            "hybrid_score": r.get("similarity", 0),
                        }
                        for r in await self.repo.match_job_postings_rpc(
                            embedding,
                            match_count=limit,
                            filter_remote=filter_remote,
                            filter_location=filter_location,
                            filter_contract=filter_contract,
                        )
                    ]
                for r in hybrid:
                    jid = str(r["job_id"])
                    sem = float(r.get("semantic_score") or r.get("hybrid_score") or 0)
                    lex = float(r.get("lexical_score") or 0)
                    if jid in by_id:
                        by_id[jid]["semantic_score"] = max(by_id[jid]["semantic_score"], sem)
                        by_id[jid]["lexical_score"] = max(by_id[jid]["lexical_score"], lex)
                        by_id[jid]["hybrid_score"] = max(
                            by_id[jid]["hybrid_score"],
                            float(r.get("hybrid_score") or sem),
                        )
                    else:
                        by_id[jid] = {
                            "job_id": jid,
                            "semantic_score": sem,
                            "lexical_score": lex,
                            "hybrid_score": float(r.get("hybrid_score") or sem),
                        }
            except Exception as exc:
                logger.warning("hybrid_rpc_failed", error=str(exc))

        # 3) Absolute fallback — never return empty when catalog has jobs.
        if not by_id:
            try:
                recent = await self.repo.list_recent_active(
                    limit=limit,
                    filter_remote=None,
                    filter_location=None,
                    filter_contract=None,
                )
                for row in recent:
                    by_id[row["id"]] = {
                        "job_id": row["id"],
                        "semantic_score": 0.0,
                        "lexical_score": 0.3,
                        "hybrid_score": 0.3,
                        "_row": row,
                    }
            except Exception as exc:
                logger.warning("recent_fallback_failed", error=str(exc))

        logger.info(
            "recall_done",
            query=query_text[:80],
            count=len(by_id),
            has_embedding=bool(embedding),
        )
        return list(by_id.values())


def _skill_overlap(
    cv_skills: list[str], job_skills: list[str], description: str
) -> tuple[float, list[str]]:
    cv_norm = {s.lower().strip() for s in cv_skills if s}
    if not cv_norm:
        return 0.0, []
    job_norm = {s.lower().strip() for s in job_skills if s}
    desc = (description or "").lower()
    matching = []
    for skill in cv_norm:
        if skill in job_norm or (len(skill) > 2 and skill in desc):
            matching.append(skill)
    score = len(matching) / max(len(cv_norm), 1)
    return min(score, 1.0), matching[:12]


def _recency_score(posted_at: str | None, last_seen_at: str | None) -> float:
    raw = posted_at or last_seen_at
    if not raw:
        return 0.3
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return 0.3
    age_days = max(0.0, (datetime.now(timezone.utc) - dt).total_seconds() / 86400)
    return math.exp(-age_days / 14.0)


def score_job(
    job: dict,
    *,
    semantic: float,
    cv_skills: list[str],
    dismissed: set[str],
    saved: set[str],
    query: str = "",
    settings: Settings | None = None,
) -> ScoreBreakdown:
    """Compute transparent weighted score breakdown."""
    settings = settings or get_settings()
    skills_score, matching = _skill_overlap(
        cv_skills,
        job.get("skills") or [],
        job.get("description_text") or "",
    )
    recency = _recency_score(job.get("posted_at"), job.get("last_seen_at"))
    trust = SOURCE_TRUST.get(job.get("source", ""), 0.5)
    job_id = job["id"]
    if job_id in dismissed:
        novelty = 0.0
    elif job_id in saved:
        novelty = 0.4
    else:
        novelty = 1.0

    query_score, query_reasons = _query_relevance(query, job) if query else (0.0, [])

    # When the user typed a query, lean hard on query relevance.
    if query.strip():
        weights = {
            "query": 0.45,
            "semantic": 0.20,
            "skills": 0.15,
            "recency": 0.10,
            "source_trust": 0.05,
            "novelty": 0.05,
        }
        parts = {
            "query": query_score,
            "semantic": max(0.0, min(float(semantic), 1.0)),
            "skills": skills_score,
            "recency": recency,
            "source_trust": trust,
            "novelty": novelty,
        }
    else:
        weights = {
            "semantic": settings.weight_semantic,
            "skills": settings.weight_skills,
            "recency": settings.weight_recency,
            "source_trust": settings.weight_source_trust,
            "novelty": settings.weight_novelty,
        }
        parts = {
            "semantic": max(0.0, min(float(semantic), 1.0)),
            "skills": skills_score,
            "recency": recency,
            "source_trust": trust,
            "novelty": novelty,
        }

    total_w = sum(weights.values()) or 1.0
    total = sum(parts[k] * (weights[k] / total_w) for k in parts)

    reasons = list(query_reasons)
    if matching:
        reasons.append(f"Skills match: {', '.join(matching[:5])}")
    if parts.get("semantic", 0) >= 0.55:
        reasons.append("Strong profile similarity")
    if parts["recency"] >= 0.7:
        reasons.append("Recently posted")
    if trust >= 0.95:
        reasons.append("Direct ATS listing")

    return ScoreBreakdown(
        semantic=round(parts.get("semantic", 0.0), 4),
        skills=round(parts["skills"], 4),
        recency=round(parts["recency"], 4),
        source_trust=round(parts["source_trust"], 4),
        novelty=round(parts["novelty"], 4),
        total=round(total * 100, 2),
        matching_skills=matching,
        reasons=reasons,
    )


def encode_cursor(score: float, job_id: str) -> str:
    payload = json.dumps({"s": score, "id": job_id})
    return base64.urlsafe_b64encode(payload.encode()).decode()


def decode_cursor(cursor: str | None) -> tuple[float, str] | None:
    if not cursor:
        return None
    try:
        data = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        return float(data["s"]), str(data["id"])
    except Exception:
        return None


def prefs_hash(prefs: dict) -> str:
    return hashlib.sha256(json.dumps(prefs, sort_keys=True).encode()).hexdigest()[:16]


class Ranker:
    """Recommendation / search orchestrator."""

    def __init__(self, repo: JobRepository):
        self.repo = repo
        self.index = SearchIndex(repo)
        self.settings = get_settings()

    async def _finalize(
        self,
        recalled: list[dict],
        *,
        cv_skills: list[str],
        dismissed: set[str],
        saved: set[str],
        query: str,
        limit: int,
        cursor: str | None,
    ) -> JobListResponse:
        job_ids = [str(r["job_id"]) for r in recalled if "_row" not in r]
        rows_by_id: dict[str, dict] = {}
        for r in recalled:
            if "_row" in r:
                rows_by_id[r["_row"]["id"]] = r["_row"]
        for row in await self.repo.get_jobs_by_ids(job_ids):
            rows_by_id[row["id"]] = row

        semantic_by_id = {
            str(r["job_id"]): float(r.get("semantic_score") or r.get("hybrid_score") or 0)
            for r in recalled
        }

        scored: list[tuple[float, JobPostingOut]] = []
        for job_id, row in rows_by_id.items():
            if row.get("status") != "active" or job_id in dismissed:
                continue
            breakdown = score_job(
                row,
                semantic=semantic_by_id.get(job_id, 0.0),
                cv_skills=cv_skills,
                dismissed=dismissed,
                saved=saved,
                query=query,
                settings=self.settings,
            )
            scored.append(
                (breakdown.total, row_to_job_out(row, score=breakdown.total, breakdown=breakdown))
            )

        scored.sort(key=lambda x: (-x[0], str(x[1].id)))
        cursor_pos = decode_cursor(cursor)
        if cursor_pos:
            c_score, c_id = cursor_pos
            scored = [
                item
                for item in scored
                if (item[0] < c_score) or (item[0] == c_score and str(item[1].id) > c_id)
            ]
        page = scored[:limit]
        next_cursor = None
        if len(scored) > limit and page:
            next_cursor = encode_cursor(page[-1][0], str(page[-1][1].id))
        return JobListResponse(items=[p for _, p in page], next_cursor=next_cursor)

    async def recommend(
        self,
        user_id: str,
        *,
        limit: int = 20,
        cursor: str | None = None,
    ) -> JobListResponse:
        profile = await self.repo.get_profile(user_id) or {}
        prefs = profile.get("search_preferences") or {}
        cv_structured = profile.get("cv_structured") or {}
        cv_skills = list(cv_structured.get("skills") or [])

        # Use job title for lexical matching — not the full skills dump.
        query_text = (prefs.get("job_title") or "").strip() or "software engineer"

        embedding = await self.repo.get_cv_embedding(user_id)
        if embedding is None:
            embedding = await embed_text_or_none(
                " ".join(
                    [
                        query_text,
                        " ".join(cv_skills[:12]),
                        prefs.get("industry") or "",
                    ]
                ).strip()
            )

        filter_remote = None
        remote_pref = (prefs.get("remote_preference") or "").lower()
        if remote_pref in ("remote", "fully remote"):
            filter_remote = True

        # Soft filters: try with prefs, then relax if empty.
        recalled = await self.index.recall(
            query_text=query_text,
            embedding=embedding,
            filter_remote=filter_remote,
            filter_location=prefs.get("location"),
            filter_contract=prefs.get("contract_type"),
            limit=80,
        )
        if not recalled:
            recalled = await self.index.recall(
                query_text=query_text,
                embedding=embedding,
                filter_remote=None,
                filter_location=None,
                filter_contract=None,
                limit=80,
            )

        signals = await self.repo.get_user_signals(user_id)
        dismissed = {s["job_id"] for s in signals if s["signal"] == "dismiss"}
        saved = {s["job_id"] for s in signals if s["signal"] == "save"}

        return await self._finalize(
            recalled,
            cv_skills=cv_skills,
            dismissed=dismissed,
            saved=saved,
            query=prefs.get("job_title") or "",
            limit=limit,
            cursor=cursor,
        )

    async def search(
        self,
        user_id: str,
        *,
        q: str = "",
        location: str | None = None,
        remote: bool | None = None,
        limit: int = 20,
        cursor: str | None = None,
    ) -> JobListResponse:
        profile = await self.repo.get_profile(user_id) or {}
        cv_structured = profile.get("cv_structured") or {}
        cv_skills = list(cv_structured.get("skills") or [])
        query_text = (q or "").strip()

        embedding = None
        if query_text:
            embedding = await embed_text_or_none(query_text)
        if embedding is None:
            embedding = await self.repo.get_cv_embedding(user_id)

        recalled = await self.index.recall(
            query_text=query_text,
            embedding=embedding,
            filter_remote=remote,
            filter_location=location,
            filter_contract=None,
            limit=100,
        )

        # If hard filters wiped the set, relax them.
        if not recalled and (remote is not None or location):
            recalled = await self.index.recall(
                query_text=query_text,
                embedding=embedding,
                filter_remote=None,
                filter_location=None,
                filter_contract=None,
                limit=100,
            )

        signals = await self.repo.get_user_signals(user_id)
        dismissed = {s["job_id"] for s in signals if s["signal"] == "dismiss"}
        saved = {s["job_id"] for s in signals if s["signal"] == "save"}

        return await self._finalize(
            recalled,
            cv_skills=cv_skills,
            dismissed=dismissed,
            saved=saved,
            query=query_text,
            limit=limit,
            cursor=cursor,
        )
