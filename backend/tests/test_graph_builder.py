"""Tests for the graph builder — structure and compilation."""

import pytest

from app.graph.builder import build_graph, compile_graph, _route_entry, _route_after_critic
from app.config import get_settings


class TestGraphStructure:
    """Verify the LangGraph pipeline is wired correctly."""

    def test_all_nodes_present(self) -> None:
        graph = build_graph()
        expected = {"router", "scout", "scraper", "hitl1", "matcher", "writer", "critic", "hitl2"}
        assert expected.issubset(set(graph.nodes.keys()))

    def test_compiles_without_checkpointer(self) -> None:
        compiled = compile_graph(checkpointer=None)
        assert compiled is not None

    def test_node_count(self) -> None:
        """8 real nodes + __start__ sentinel."""
        graph = build_graph()
        # __start__ is always present
        assert len(graph.nodes) >= 8


class TestRouteEntry:
    """Test the entry routing function."""

    def test_explore_mode_routes_to_scout(self) -> None:
        state = {"entry_mode": "explore"}
        assert _route_entry(state) == "scout"

    def test_url_mode_routes_to_scraper(self) -> None:
        state = {"entry_mode": "url"}
        assert _route_entry(state) == "scraper"

    def test_missing_entry_mode_defaults_to_scraper(self) -> None:
        assert _route_entry({}) == "scraper"


class TestRouteAfterCritic:
    """Test the critic routing function."""

    def test_high_score_routes_to_hitl2(self) -> None:
        settings = get_settings()
        state = {"critic_score": settings.critic_threshold + 1, "revision_count": 0, "run_id": "x"}
        assert _route_after_critic(state) == "hitl2"

    def test_low_score_routes_to_writer(self) -> None:
        settings = get_settings()
        state = {"critic_score": settings.critic_threshold - 1, "revision_count": 0, "run_id": "x"}
        assert _route_after_critic(state) == "writer"

    def test_max_revisions_reached_routes_to_hitl2(self) -> None:
        settings = get_settings()
        # Score below threshold BUT max revisions reached
        state = {
            "critic_score": settings.critic_threshold - 10,
            "revision_count": settings.max_revisions,
            "run_id": "x",
        }
        assert _route_after_critic(state) == "hitl2"

    def test_score_at_threshold_routes_to_hitl2(self) -> None:
        settings = get_settings()
        state = {
            "critic_score": settings.critic_threshold,
            "revision_count": 0,
            "run_id": "x",
        }
        assert _route_after_critic(state) == "hitl2"
