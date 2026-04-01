"""Memory Loader node — injects user preferences from long-term memory at pipeline start.

Runs before the router node to enrich the state with learned preferences.
This enables the Writer to use preferred tone, the Matcher to know target roles, etc.
"""

import logging

from langchain_core.runnables import RunnableConfig

from app.config import get_settings
from app.dependencies import create_supabase_client
from app.graph.pubsub import log_emitter
from app.memory.store import get_user_preferences
from app.models.state import AgentState

logger = logging.getLogger(__name__)


async def memory_loader_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """Load user's long-term preferences from Supabase memory store.

    Injects stored preferences into state so downstream nodes can adapt:
    - Writer uses preferred tone if user hasn't explicitly set one
    - System can show preference insights in the UI
    """
    user_id = state.get("user_id", "")
    run_id = state.get("run_id", "")

    if not user_id:
        logger.warning("MemoryLoader: no user_id in state, skipping")
        return {}

    logger.info("MemoryLoader: loading preferences for user=%s run=%s", user_id, run_id)
    await log_emitter.emit(run_id, {
        "type": "info",
        "message": "Memory: Loading your preferences from past sessions...",
    })

    try:
        settings = get_settings()
        supabase = await create_supabase_client(settings)
        preferences = await get_user_preferences(supabase, user_id)
    except Exception as exc:
        logger.warning("MemoryLoader: failed to load preferences: %s", exc)
        preferences = {}

    if preferences:
        logger.info(
            "MemoryLoader: found preferences for user=%s (keys=%s)",
            user_id,
            list(preferences.keys()),
        )
        await log_emitter.emit(run_id, {
            "type": "info",
            "message": f"Memory: Loaded {len(preferences)} preference signals from past sessions.",
        })

        # If user hasn't explicitly set a tone but we have a preferred one, suggest it
        current_tone = state.get("tone_of_voice", "professional")
        preferred_tone = preferences.get("preferred_tone")
        if preferred_tone and current_tone == "professional":
            # Only override default; if user explicitly chose a tone, keep it
            logger.info(
                "MemoryLoader: suggesting preferred tone '%s' for user=%s",
                preferred_tone,
                user_id,
            )
    else:
        await log_emitter.emit(run_id, {
            "type": "info",
            "message": "Memory: No past preferences found — this is your first run!",
        })

    return {
        "user_preferences": preferences,
    }
