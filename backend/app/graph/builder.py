"""LangGraph graph builder — assembles the full pipeline.

Graph structure (MVP):
    START → memory_loader → router → (scout | scraper)
    scout → hitl1 [interrupt] → matcher
    scraper → matcher
    matcher → writer → critic → score_router
    score_router → writer (retry, max 3) | hitl2 [interrupt]
    hitl2 → memory_writer → END
"""

import logging

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import END, START, StateGraph

from app.config import get_settings
from app.graph.nodes.critic import critic_node
from app.graph.nodes.hitl import hitl1_node, hitl2_node
from app.graph.nodes.matcher import matcher_node
from app.graph.nodes.memory_loader import memory_loader_node
from app.graph.nodes.memory_writer import memory_writer_node
from app.graph.nodes.router import router_node
from app.graph.nodes.scout import scout_node
from app.graph.nodes.scraper import scraper_node
from app.graph.nodes.writer import writer_node
from app.models.state import AgentState

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Routing functions
# ---------------------------------------------------------------------------


def _route_entry(state: AgentState) -> str:
    """Route to scout (explore mode) or scraper (URL mode)."""
    return "scout" if state.get("entry_mode") == "explore" else "scraper"


def _route_after_critic(state: AgentState) -> str:
    """Route after critic evaluation.

    Sends to HITL-2 when score meets threshold OR max revisions reached.
    Otherwise retries the writer.
    """
    settings = get_settings()
    score = state.get("critic_score", 0)
    revisions = state.get("revision_count", 0)

    if score >= settings.critic_threshold:
        return "hitl2"
    if revisions >= settings.max_revisions:
        logger.warning(
            "Max revisions (%d) reached for run=%s — forcing HITL-2",
            settings.max_revisions,
            state.get("run_id"),
        )
        return "hitl2"
    return "writer"


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------


def build_graph() -> StateGraph:
    """Construct the CareerAgent pipeline StateGraph (uncompiled)."""
    graph = StateGraph(AgentState)

    # --- Nodes ---
    graph.add_node("memory_loader", memory_loader_node)
    graph.add_node("router", router_node)
    graph.add_node("scout", scout_node)
    graph.add_node("scraper", scraper_node)
    graph.add_node("hitl1", hitl1_node)
    graph.add_node("matcher", matcher_node)
    graph.add_node("writer", writer_node)
    graph.add_node("critic", critic_node)
    graph.add_node("hitl2", hitl2_node)
    graph.add_node("memory_writer", memory_writer_node)

    # --- Entry: START → memory_loader → router ---
    graph.add_edge(START, "memory_loader")
    graph.add_edge("memory_loader", "router")

    # --- Router → Scout or Scraper ---
    graph.add_conditional_edges(
        "router",
        _route_entry,
        {"scout": "scout", "scraper": "scraper"},
    )

    # --- Scout → HITL-1 → Matcher ---
    graph.add_edge("scout", "hitl1")
    graph.add_edge("hitl1", "matcher")

    # --- Scraper → Matcher ---
    graph.add_edge("scraper", "matcher")

    # --- Matcher → Writer → Critic ---
    graph.add_edge("matcher", "writer")
    graph.add_edge("writer", "critic")

    # --- Critic → score router → Writer (retry) or HITL-2 ---
    graph.add_conditional_edges(
        "critic",
        _route_after_critic,
        {"writer": "writer", "hitl2": "hitl2"},
    )

    # --- HITL-2 → Memory Writer → END ---
    graph.add_edge("hitl2", "memory_writer")
    graph.add_edge("memory_writer", END)

    return graph


def compile_graph(checkpointer: BaseCheckpointSaver | None = None):
    """Build and compile the graph.

    Args:
        checkpointer: A LangGraph checkpoint saver (e.g. AsyncPostgresSaver).
                      Required for HITL interrupt/resume to work.

    Returns:
        Compiled graph ready for ainvoke / astream.
    """
    graph = build_graph()
    # interrupt_before is NOT needed — we use interrupt() inside node functions,
    # which is the recommended LangGraph 1.x pattern. The checkpointer handles
    # state persistence across interrupts automatically.
    return graph.compile(checkpointer=checkpointer)
