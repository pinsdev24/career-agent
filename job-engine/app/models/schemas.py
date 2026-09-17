"""Pydantic API and domain schemas."""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AtsProvider(str, Enum):
    GREENHOUSE = "greenhouse"
    LEVER = "lever"
    ASHBY = "ashby"
    WORKABLE = "workable"
    TAVILY = "tavily"
    UNKNOWN = "unknown"


class JobStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REMOVED = "removed"
    UNKNOWN = "unknown"


class SignalType(str, Enum):
    SAVE = "save"
    DISMISS = "dismiss"
    APPLY = "apply"
    IMPRESSION = "impression"


class CanonicalJob(BaseModel):
    """Normalized job posting from any connector."""

    source: AtsProvider
    external_id: str
    company_slug: str | None = None
    company_name: str
    title: str
    location: str | None = None
    remote: bool | None = None
    contract_type: str | None = None
    salary: str | None = None
    description_text: str
    apply_url: str
    skills: list[str] = Field(default_factory=list)
    posted_at: datetime | None = None
    content_hash: str = ""
    raw: dict[str, Any] = Field(default_factory=dict)


class ScoreBreakdown(BaseModel):
    semantic: float = 0.0
    skills: float = 0.0
    recency: float = 0.0
    source_trust: float = 0.0
    novelty: float = 0.0
    total: float = 0.0
    matching_skills: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)


class JobPostingOut(BaseModel):
    id: UUID
    source: str
    external_id: str
    company_name: str
    company_slug: str | None = None
    title: str
    location: str | None = None
    remote: bool | None = None
    contract_type: str | None = None
    salary: str | None = None
    description_text: str | None = None
    apply_url: str
    skills: list[str] = Field(default_factory=list)
    status: str
    posted_at: datetime | None = None
    last_seen_at: datetime | None = None
    score: float | None = None
    score_breakdown: ScoreBreakdown | None = None


class JobListResponse(BaseModel):
    items: list[JobPostingOut]
    next_cursor: str | None = None


class SignalRequest(BaseModel):
    type: SignalType


class SignalResponse(BaseModel):
    ok: bool = True


class IngestStatsResponse(BaseModel):
    recent_runs: list[dict[str, Any]]
    active_jobs: int
    companies: int


class HealthResponse(BaseModel):
    status: str
    service: str = "job-engine"


class ReadyResponse(BaseModel):
    status: str
    redis: bool
    supabase: bool
