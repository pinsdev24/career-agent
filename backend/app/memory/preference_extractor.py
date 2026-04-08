"""Preference extractor — learns user patterns from completed runs.

After a pipeline run completes, this module analyzes the run data and extracts
user preference signals that should be persisted for future runs:
  - Preferred tone of voice (observed across runs)
  - Target industries and role types
  - Company preferences
  - Letter style feedback patterns
"""

import logging
from datetime import datetime, timezone

from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models.state import AgentState

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Structured output for preference extraction
# ---------------------------------------------------------------------------


class ExtractedPreferences(BaseModel):
    """Preferences extracted from a completed pipeline run."""

    preferred_tone: str | None = Field(
        None, description="Tone that worked well (professional, conversational, etc.)"
    )
    target_industry: str | None = Field(
        None, description="Industry of the applied company (fintech, healthtech, etc.)"
    )
    target_role_type: str | None = Field(
        None, description="Type of role (backend, fullstack, data, management, etc.)"
    )
    target_seniority: str | None = Field(
        None, description="Seniority level (junior, mid, senior, lead, etc.)"
    )
    letter_length_preference: str | None = Field(
        None, description="'short', 'medium', or 'long' based on final letter"
    )
    style_notes: str | None = Field(
        None, description="Any notable style preferences observed from user edits"
    )


EXTRACTION_PROMPT = """Analyze this completed job application pipeline run and extract user preferences.

**RUN DATA:**
- Tone selected: {tone}
- Job title: {job_title}
- Company: {company}
- Match score: {match_score}
- Best critic score: {best_score}
- Final letter word count: {word_count}
- User made edits: {user_edited}

Extract preference signals. Only fill fields where you have confident signals.
If the user edited the letter significantly, note what style changes they made.
"""


async def extract_preferences_from_run(state: AgentState) -> ExtractedPreferences:
    """Analyze a completed run and extract user preference signals.

    Uses a cheap/fast model since this is a simple extraction task.
    """
    settings = get_settings()
    offer = state.get("selected_offer", {})
    final_letter = state.get("final_letter", "")
    best_draft = state.get("best_draft", "")

    # Detect if user edited the letter
    user_edited = final_letter != best_draft and bool(final_letter)

    prompt = EXTRACTION_PROMPT.format(
        tone=state.get("tone_of_voice", "professional"),
        job_title=offer.get("title", "Unknown"),
        company=offer.get("company", "Unknown"),
        match_score=state.get("match_score", 0),
        best_score=state.get("best_score", 0),
        word_count=len(final_letter.split()) if final_letter else 0,
        user_edited=user_edited,
    )

    try:
        llm = ChatOpenAI(
            model=settings.fast_model,  # Use the standard model (cheap/fast)
            api_key=settings.openai_api_key,
            temperature=0,
        )
        structured_llm = llm.with_structured_output(ExtractedPreferences)
        result = await structured_llm.ainvoke(
            [SystemMessage(content=prompt)]
        )
        logger.info("PreferenceExtractor: extracted preferences for run=%s", state.get("run_id"))
        return result

    except Exception as exc:
        logger.warning("PreferenceExtractor: extraction failed: %s", exc)
        # Return minimal preferences from deterministic data
        return ExtractedPreferences(
            preferred_tone=state.get("tone_of_voice"),
            target_role_type=offer.get("title"),
        )


def build_application_summary(state: AgentState) -> dict:
    """Build a compact application summary for the user's history."""
    offer = state.get("selected_offer", {})
    return {
        "company": offer.get("company", "Unknown"),
        "role": offer.get("title", "Unknown"),
        "match_score": state.get("match_score", 0),
        "best_score": state.get("best_score", 0),
        "tone_used": state.get("tone_of_voice", "professional"),
        "revision_count": state.get("revision_count", 0),
        "date": datetime.now(timezone.utc).isoformat(),
    }
