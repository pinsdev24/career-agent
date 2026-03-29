"""Pydantic schemas for API requests and responses."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class EntryMode(str, Enum):
    """Pipeline entry mode."""

    EXPLORE = "explore"
    URL = "url"


class PipelineStatus(str, Enum):
    """Pipeline run status."""

    STARTED = "started"
    SCOUTING = "scouting"
    WAITING_OFFER_SELECTION = "waiting_offer_selection"
    MATCHING = "matching"
    WRITING = "writing"
    CRITIQUING = "critiquing"
    WAITING_LETTER_REVIEW = "waiting_letter_review"
    COMPLETED = "completed"
    FAILED = "failed"


class ToneOfVoice(str, Enum):
    """Available tone-of-voice presets."""

    PROFESSIONAL = "professional"
    CONVERSATIONAL = "conversational"
    ENTHUSIASTIC = "enthusiastic"
    FORMAL = "formal"
    CONCISE = "concise"


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------


class SearchPreferences(BaseModel):
    """User search preferences for job exploration."""

    location: str | None = None
    contract_type: str | None = Field(
        None,
        description="e.g. CDI, CDD, freelance, internship",
    )
    remote_preference: str | None = Field(
        None,
        description="e.g. remote, onsite, hybrid",
    )
    job_title: str | None = None
    industry: str | None = None


class ProfileResponse(BaseModel):
    """Profile data returned to the frontend."""

    id: str
    cv_raw_text: str | None = None
    cv_structured: dict[str, Any] | None = None
    tone_of_voice: ToneOfVoice = ToneOfVoice.PROFESSIONAL
    search_preferences: SearchPreferences | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ProfilePreferencesUpdate(BaseModel):
    """Update search preferences and tone of voice."""

    tone_of_voice: ToneOfVoice | None = None
    search_preferences: SearchPreferences | None = None


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


class PipelineStartRequest(BaseModel):
    """Request to start a new pipeline run."""

    entry_mode: EntryMode
    offer_url: HttpUrl | None = None


class JobOfferSummary(BaseModel):
    """Condensed job offer for display in HITL-1."""

    id: str
    title: str
    company: str
    location: str | None = None
    url: str
    contact_email: str | None = None
    pre_score: float = Field(ge=0, le=100)
    snippet: str | None = None


class GapReport(BaseModel):
    """Matcher gap analysis result."""

    match_score: int = Field(ge=0, le=100)
    matching_skills: list[str] = []
    missing_skills: list[str] = []
    summary: str = ""


class CriticScore(BaseModel):
    """Critic evaluation on 5 dimensions."""

    relevance: int = Field(ge=0, le=100)
    tone: int = Field(ge=0, le=100)
    structure: int = Field(ge=0, le=100)
    specificity: int = Field(ge=0, le=100)
    persuasiveness: int = Field(ge=0, le=100)
    overall: int = Field(ge=0, le=100)
    feedback: str = ""


class PipelineRunResponse(BaseModel):
    """Full pipeline run data."""

    id: str
    user_id: str
    entry_mode: EntryMode
    status: PipelineStatus
    offer_url: str | None = None
    selected_offer: JobOfferSummary | None = None
    discovered_offers: list[JobOfferSummary] | None = None
    gap_report: GapReport | None = None
    draft_letter: str | None = None
    final_letter: str | None = None
    critic_score: CriticScore | None = None
    revision_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @field_validator("critic_score", mode="before")
    @classmethod
    def coerce_critic_score(cls, v: object) -> object:
        """Accept a full dict (new format) or drop a bare int (legacy DB row)."""
        if isinstance(v, int):
            # Old runs stored a bare int — discard it, let it default to None
            return None
        return v


class PipelineStatusResponse(BaseModel):
    """Lightweight status check response."""

    id: str
    status: PipelineStatus
    revision_count: int = 0


# ---------------------------------------------------------------------------
# HITL
# ---------------------------------------------------------------------------


class HITLOfferSelection(BaseModel):
    """User selects an offer from the discovered list (HITL-1)."""

    selected_offer_id: str


class HITLLetterReview(BaseModel):
    """User reviews and optionally edits the letter (HITL-2)."""

    edited_letter: str
    approved: bool = True
