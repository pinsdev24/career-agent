"""Router node — determines entry mode and routes to scout or scraper."""

import logging

from app.graph.pubsub import log_emitter
from app.models.state import AgentState

logger = logging.getLogger(__name__)


async def router_node(state: AgentState) -> AgentState:
    """Determine entry mode and pass through.

    The actual routing is handled by conditional edges in builder.py.
    This node validates the state and sets initial status.
    """
    entry_mode = state.get("entry_mode", "explore")
    logger.info(
        "Router: run=%s, mode=%s",
        state.get("run_id"),
        entry_mode,
    )
    await log_emitter.emit(
        state.get("run_id"),
        {"type": "info", "message": f"Router: Determining pipeline route (Mode: {entry_mode})..."},
    )

    return {"status": "started"}
