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
    WAITING_LOOP_DECISION = "waiting_loop_decision"  # HITL-3: apply to another offer?


class ToneOfVoice(str, Enum):
    """Available tone-of-voice presets."""

    PROFESSIONAL = "professional"
    CONVERSATIONAL = "conversational"
    ENTHUSIASTIC = "enthusiastic"
    FORMAL = "formal"
    CONCISE = "concise"


class LanguagePreference(str, Enum):
    """Supported LLM output languages (ISO 639-1)."""

    EN = "en"
    FR = "fr"
    NL = "nl"


class WorkMode(str, Enum):
    """Onsite / hybrid / remote — stored as structured codes."""

    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class ContractType(str, Enum):
    """Employment contract family."""

    PERMANENT = "permanent"
    FREELANCE = "freelance"
    INTERNSHIP = "internship"
    FIXED_TERM = "fixed_term"


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------


_LOCATION_TO_COUNTRY: dict[str, str] = {
    "belgium": "BE",
    "belgique": "BE",
    "belgie": "BE",
    "belgië": "BE",
    "brussels": "BE",
    "bruxelles": "BE",
    "brussel": "BE",
    "ghent": "BE",
    "gent": "BE",
    "antwerp": "BE",
    "netherlands": "NL",
    "nederland": "NL",
    "holland": "NL",
    "amsterdam": "NL",
    "luxembourg": "LU",
    "france": "FR",
    "paris": "FR",
    "germany": "DE",
    "deutschland": "DE",
    "berlin": "DE",
    "united kingdom": "GB",
    "uk": "GB",
    "great britain": "GB",
    "england": "GB",
    "london": "GB",
    "ireland": "IE",
    "dublin": "IE",
    "spain": "ES",
    "italy": "IT",
    "switzerland": "CH",
    "united states": "US",
    "usa": "US",
    "canada": "CA",
    "argentina": "AR",
}


def countries_from_location_text(location: str | None) -> list[str]:
    """Best-effort ISO codes from legacy free-text location."""
    import re
    import unicodedata

    raw = (location or "").strip()
    if not raw:
        return []
    folded = unicodedata.normalize("NFKD", raw)
    folded = "".join(ch for ch in folded if not unicodedata.combining(ch)).lower()
    folded = re.sub(r"\s+", " ", folded).strip()
    found: list[str] = []
    seen: set[str] = set()
    for alias, code in sorted(_LOCATION_TO_COUNTRY.items(), key=lambda kv: -len(kv[0])):
        if alias == folded or re.search(rf"(?<![a-z0-9]){re.escape(alias)}(?![a-z0-9])", folded):
            if code not in seen:
                seen.add(code)
                found.append(code)
    token = folded.upper()
    if len(token) == 2 and token.isalpha() and token not in seen:
        mapped = "GB" if token == "UK" else token
        found.append(mapped)
    return found


class SearchPreferences(BaseModel):
    """User search preferences for job exploration (Cut 3 structured + legacy)."""

    location: str | None = None
    countries: list[str] = Field(default_factory=list)
    cities: list[str] = Field(default_factory=list)
    work_modes: list[str] = Field(default_factory=list)
    contract_types: list[str] = Field(default_factory=list)
    preferred_roles: list[str] = Field(default_factory=list)
    contract_type: str | None = Field(
        None,
        description="Legacy single contract string (e.g. CDI). Prefer contract_types.",
    )
    remote_preference: str | None = Field(
        None,
        description="Legacy single work-mode string. Prefer work_modes.",
    )
    job_title: str | None = None
    industry: str | None = None

    @field_validator("countries", mode="before")
    @classmethod
    def _countries(cls, value: Any) -> list[str]:
        if not value:
            return []
        if isinstance(value, str):
            value = [value]
        out: list[str] = []
        seen: set[str] = set()
        for item in value:
            code = str(item).strip().upper()
            if len(code) == 2 and code.isalpha() and code not in seen:
                seen.add(code)
                out.append("GB" if code == "UK" else code)
        return out

    @field_validator("cities", "preferred_roles", "work_modes", "contract_types", mode="before")
    @classmethod
    def _str_list(cls, value: Any) -> list[str]:
        if not value:
            return []
        if isinstance(value, str):
            value = [value]
        out: list[str] = []
        seen: set[str] = set()
        for item in value:
            text = str(item).strip()
            key = text.lower()
            if not text or key in seen:
                continue
            seen.add(key)
            out.append(text)
        return out

    def normalized(self) -> dict[str, Any]:
        data = self.model_dump(exclude_none=True)
        countries = list(self.countries)
        if not countries:
            countries = countries_from_location_text(self.location)
        data["countries"] = countries
        if self.work_modes:
            data["work_modes"] = [m.lower() for m in self.work_modes]
        elif self.remote_preference:
            pref = self.remote_preference.strip().lower()
            mapped = {
                "remote": "remote",
                "fully remote": "remote",
                "hybrid": "hybrid",
                "onsite": "onsite",
                "on-site": "onsite",
                "on site": "onsite",
            }.get(pref)
            if mapped:
                data["work_modes"] = [mapped]
        if self.contract_types:
            data["contract_types"] = [c.lower().replace(" ", "_") for c in self.contract_types]
        return data


class ProfileResponse(BaseModel):
    """Profile data returned to the frontend."""

    id: str
    cv_raw_text: str | None = None
    cv_structured: dict[str, Any] | None = None
    tone_of_voice: ToneOfVoice = ToneOfVoice.PROFESSIONAL
    language_preference: LanguagePreference = LanguagePreference.EN
    search_preferences: SearchPreferences | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ProfilePreferencesUpdate(BaseModel):
    """Update search preferences, tone of voice, and language."""

    tone_of_voice: ToneOfVoice | None = None
    language_preference: LanguagePreference | None = None
    search_preferences: SearchPreferences | None = None


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


class PipelineStartRequest(BaseModel):
    """Request to start a new pipeline run."""

    entry_mode: EntryMode
    offer_url: HttpUrl | None = None


class CompanyInfoSchema(BaseModel):
    """Structured company information for frontend display."""

    name: str
    website: str | None = None
    industry: str | None = None
    size: str | None = None
    description: str | None = None


class JobOfferSummary(BaseModel):
    """Condensed job offer for display in HITL-1."""

    id: str
    title: str
    company: str
    company_info: CompanyInfoSchema | None = None
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
    # Best-of-N tracking — the highest-scoring draft across all revisions
    best_draft: str | None = None
    best_score: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None
    error_details: dict[str, Any] | None = None  # Populated on pipeline failure

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
    user_feedback: str | None = Field(default=None)


# ---------------------------------------------------------------------------
# Memory
# ---------------------------------------------------------------------------


class MemoryResponse(BaseModel):
    """A single memory entry."""

    memory_key: str
    memory_data: dict[str, Any]
    updated_at: datetime | None = None


class MemoryUpdate(BaseModel):
    """Request to update a specific memory entry."""

    memory_data: dict[str, Any]
