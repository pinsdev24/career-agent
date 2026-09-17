"""No-HITL packet graph: matcher → writer → critic until threshold or max revisions."""

from __future__ import annotations

import logging
from typing import Any

from langgraph.graph import END, START, StateGraph

from app.config import get_settings
from app.graph.nodes.critic import critic_node
from app.graph.nodes.matcher import matcher_node
from app.graph.nodes.memory_loader import memory_loader_node
from app.graph.nodes.writer import writer_node
from app.models.state import AgentState

logger = logging.getLogger(__name__)


def _route_packet_after_critic(state: AgentState) -> str:
    settings = get_settings()
    score = state.get("critic_score", 0)
    revisions = state.get("revision_count", 0)
    if score >= settings.critic_threshold:
        return "done"
    if revisions >= settings.max_revisions:
        logger.warning(
            "Packet graph: max revisions reached run=%s",
            state.get("run_id"),
        )
        return "done"
    return "writer"


def build_packet_graph() -> StateGraph:
    graph = StateGraph(AgentState)
    graph.add_node("memory_loader", memory_loader_node)
    graph.add_node("matcher", matcher_node)
    graph.add_node("writer", writer_node)
    graph.add_node("critic", critic_node)
    graph.add_edge(START, "memory_loader")
    graph.add_edge("memory_loader", "matcher")
    graph.add_edge("matcher", "writer")
    graph.add_edge("writer", "critic")
    graph.add_conditional_edges(
        "critic",
        _route_packet_after_critic,
        {"writer": "writer", "done": END},
    )
    return graph


def compile_packet_graph():
    return build_packet_graph().compile()


async def run_packet_graph(initial_state: dict[str, Any]) -> dict[str, Any]:
    """Run the packet graph to completion and return merged state."""
    graph = compile_packet_graph()
    result = await graph.ainvoke(initial_state)
    return result if isinstance(result, dict) else dict(result)
