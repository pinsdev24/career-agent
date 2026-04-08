"""LangGraph agent state definition."""

from __future__ import annotations

import operator
from typing import Annotated, Literal, TypedDict


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

    # --- Summaries (generated once by Matcher, reused by Writer & Critic) ---
    cv_summary: str      # Condensed CV (~200 words) for context-efficient prompts
    offer_summary: str   # Condensed offer (~150 words) for context-efficient prompts
    gap_summary: str     # Narrative gap summary for the writer prompt

    # --- Writer output ---
    draft_letter: str
    user_feedback: str | None
    is_manual_rewrite: bool | None

    # --- Critic output ---
    critic_score: int
    critic_feedback: dict
    revision_count: int

    # --- Best-of-N tracking ---
    # Accumulates all drafts with their scores across revisions.
    # Uses operator.add reducer so each node append doesn't overwrite.
    draft_history: Annotated[list[dict], operator.add]
    best_draft: str   # The highest-scoring draft so far
    best_score: int   # The highest score achieved
    best_feedback: dict # The feedback matching the highest-scoring draft

    # --- Long-term memory (injected by memory_loader) ---
    user_preferences: dict  # Preferences from past runs (tone, role types, etc.)

    # --- Final output (post HITL-2) ---
    final_letter: str

    # --- Error tracking ---
    error_details: dict | None  # Set by nodes on unrecoverable failure; cleared on resume

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
