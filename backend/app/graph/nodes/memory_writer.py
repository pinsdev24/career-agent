"""Memory Writer node — persists learned patterns after pipeline completion.

Runs after HITL-2 (before END) to:
1. Extract preference signals from the completed run
2. Update the user's long-term preference profile
3. Record the application in history
"""

import logging

from langchain_core.runnables import RunnableConfig

from app.config import get_settings
from app.dependencies import create_supabase_client
from app.graph.pubsub import log_emitter
from app.memory.preference_extractor import (
    build_application_summary,
    extract_preferences_from_run,
)
from app.memory.store import record_application, update_user_preferences
from app.models.state import AgentState

logger = logging.getLogger(__name__)


async def memory_writer_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """Extract and persist user preferences from the completed run.

    This node runs after HITL-2 approval, so we know the pipeline succeeded.
    It learns from:
    - The tone of voice used
    - The type of role and company applied to
    - The critic score achieved
    - Whether the user edited the draft (indicating style preferences)
    """
    user_id = state.get("user_id", "")
    run_id = state.get("run_id", "")

    if not user_id:
        logger.warning("MemoryWriter: no user_id in state, skipping")
        return {}

    logger.info("MemoryWriter: extracting preferences from run=%s", run_id)
    await log_emitter.emit(run_id, {
        "type": "info",
        "message": "Memory: Learning from this session to improve future runs...",
    })

    try:
        settings = get_settings()
        supabase = await create_supabase_client(settings)

        # 1. Extract preferences from this run
        extracted = await extract_preferences_from_run(state)
        logger.info("MemoryWriter: extracted preferences: %s", extracted.model_dump())

        # 2. Build preference updates (only non-None values)
        preference_updates: dict = {}
        if extracted.preferred_tone:
            preference_updates["preferred_tone"] = extracted.preferred_tone
        if extracted.target_industry:
            # Accumulate industries (don't overwrite)
            existing = (state.get("user_preferences", {}) or {})
            industries = set(existing.get("preferred_industries", []))
            industries.add(extracted.target_industry)
            preference_updates["preferred_industries"] = list(industries)[:10]  # Cap at 10
        if extracted.target_role_type:
            existing = (state.get("user_preferences", {}) or {})
            roles = set(existing.get("preferred_role_types", []))
            roles.add(extracted.target_role_type)
            preference_updates["preferred_role_types"] = list(roles)[:10]
        if extracted.target_seniority:
            preference_updates["target_seniority"] = extracted.target_seniority
        if extracted.letter_length_preference:
            preference_updates["letter_length_preference"] = extracted.letter_length_preference
        if extracted.style_notes:
            preference_updates["style_notes"] = extracted.style_notes

        # 3. Persist preferences
        if preference_updates:
            await update_user_preferences(supabase, user_id, preference_updates)
            logger.info(
                "MemoryWriter: updated %d preference fields for user=%s",
                len(preference_updates),
                user_id,
            )

        # 4. Record this application in history
        app_summary = build_application_summary(state)
        await record_application(supabase, user_id, app_summary)

        await log_emitter.emit(run_id, {
            "type": "info",
            "message": f"Memory: Saved {len(preference_updates)} preference updates for future sessions.",
        })

    except Exception as exc:
        # Memory writing is non-critical — don't fail the pipeline
        logger.warning("MemoryWriter: failed to persist preferences: %s", exc)
        await log_emitter.emit(run_id, {
            "type": "info",
            "message": "Memory: Could not save preferences (non-critical).",
        })

    # Don't modify any state — this is a side-effect-only node
    return {}
