"""LangGraph agent state definition."""

from __future__ import annotations

from typing import Literal, TypedDict


class AgentState(TypedDict, total=False):
    """Shared state flowing through the LangGraph pipeline.

    All keys are optional (total=False) so nodes only set what they produce.
    """

    # --- Identity ---
    user_id: str
    run_id: str

    # --- Entry ---
    entry_mode: Literal["explore", "url"]
    offer_url: str | None

    # --- Profile ---
    cv_text: str
    cv_structured: dict
    search_preferences: dict  # location, contract_type, remote_preference, etc.
    tone_of_voice: str  # user-selected tone preset

    # --- Scout output ---
    discovered_offers: list[dict]  # raw offers from Tavily search

    # --- Selected offer (post HITL-1 or Scraper) ---
    selected_offer: dict

    # --- Matcher output ---
    gap_report: dict
    match_score: int

    # --- Writer output ---
    draft_letter: str

    # --- Critic output ---
    critic_score: int
    critic_feedback: dict
    revision_count: int

    # --- Final output (post HITL-2) ---
    final_letter: str

    # --- Pipeline status ---
    status: Literal[
        "started",
        "scouting",
        "waiting_offer_selection",
        "matching",
        "writing",
        "critiquing",
        "waiting_letter_review",
        "completed",
        "failed",
    ]
