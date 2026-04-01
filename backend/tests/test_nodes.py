"""Tests for graph nodes — all LLM and API calls are mocked."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Router node
# ---------------------------------------------------------------------------


class TestRouterNode:
    """Router is a pure function — no mocking needed."""

    @pytest.mark.asyncio
    async def test_routes_explore_mode(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.router import router_node

        state = {**sample_agent_state, "entry_mode": "explore"}
        result = await router_node(state)  # router_node takes only state
        assert result["status"] == "started"

    @pytest.mark.asyncio
    async def test_routes_url_mode(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.router import router_node

        state = {**sample_agent_state, "entry_mode": "url", "offer_url": "https://example.com/job"}
        result = await router_node(state)
        assert result["status"] == "started"


# ---------------------------------------------------------------------------
# Scout node
# ---------------------------------------------------------------------------


class TestScoutNode:
    """Scout calls Tavily search + embedding — both mocked."""

    @pytest.mark.asyncio
    async def test_scout_returns_offers(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.scout import scout_node

        mock_results = [
            {
                "title": "Backend Engineer",
                "url": "https://techcorp.com/jobs/1",
                "content": "Python FastAPI PostgreSQL role",
                "score": 0.85,
            },
            {
                "title": "Python Developer",
                "url": "https://startup.io/jobs/2",
                "content": "Django Python role",
                "score": 0.72,
            },
        ]
        mock_embedding = [0.1] * 1536

        with patch("app.graph.nodes.scout.search_jobs", new=AsyncMock(return_value=mock_results)):
            with patch(
                "app.graph.nodes.scout.embed_text", new=AsyncMock(return_value=mock_embedding)
            ):
                with patch("app.tools.embedding_tools.OpenAIEmbeddings") as MockEmb:
                    MockEmb.return_value.aembed_documents = AsyncMock(
                        return_value=[mock_embedding, mock_embedding]
                    )
                    result = await scout_node(sample_agent_state, mock_runnable_config)

        assert "discovered_offers" in result
        offers = result["discovered_offers"]
        assert len(offers) == 2
        assert offers[0]["pre_score"] >= 0  # sorted desc

    @pytest.mark.asyncio
    async def test_scout_handles_empty_results(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.scout import scout_node

        with patch("app.graph.nodes.scout.search_jobs", new=AsyncMock(return_value=[])):
            with patch("app.graph.nodes.scout.embed_text", new=AsyncMock(return_value=[])):
                with patch("app.tools.embedding_tools.OpenAIEmbeddings") as MockEmb:
                    MockEmb.return_value.aembed_documents = AsyncMock(return_value=[])
                    result = await scout_node(sample_agent_state, mock_runnable_config)

        assert result["discovered_offers"] == []
        assert result["status"] == "scouting"

    @pytest.mark.asyncio
    async def test_scout_sorts_by_pre_score(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.scout import scout_node

        # Two results with different scores
        emb_high = [0.9] * 1536
        emb_low = [0.1] * 1536
        mock_results = [
            {
                "title": "Low Score Job",
                "url": "https://a.com",
                "content": "generic role",
                "score": 0.1,
            },
            {
                "title": "High Score Job",
                "url": "https://b.com",
                "content": "Python FastAPI role",
                "score": 0.9,
            },
        ]
        cv_emb = [0.9] * 1536

        with patch("app.graph.nodes.scout.search_jobs", new=AsyncMock(return_value=mock_results)):
            with patch("app.graph.nodes.scout.embed_text", new=AsyncMock(return_value=cv_emb)):
                with patch("app.tools.embedding_tools.OpenAIEmbeddings") as MockEmb:
                    MockEmb.return_value.aembed_documents = AsyncMock(
                        return_value=[emb_low, emb_high]
                    )
                    result = await scout_node(sample_agent_state, mock_runnable_config)

        offers = result["discovered_offers"]
        scores = [o["pre_score"] for o in offers]
        assert scores == sorted(scores, reverse=True)


# ---------------------------------------------------------------------------
# Scraper node
# ---------------------------------------------------------------------------


class TestScraperNode:
    """Scraper calls Tavily extract + LLM with_structured_output — mocked."""

    @pytest.mark.asyncio
    async def test_scraper_extracts_and_structures_offer(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.scraper import StructuredOffer, scraper_node

        mock_raw = "Backend Engineer at TechCorp. Python, FastAPI required. Paris, CDI."

        mock_structured = StructuredOffer(
            title="Backend Engineer",
            company="TechCorp",
            location="Paris",
            contract_type="CDI",
            remote="hybrid",
            required_skills=["Python", "FastAPI"],
            description="Backend role at TechCorp.",
        )

        with patch(
            "app.graph.nodes.scraper.extract_url",
            new=AsyncMock(return_value={"raw_content": mock_raw}),
        ):
            mock_llm_chain = AsyncMock(return_value=mock_structured)
            with patch("app.graph.nodes.scraper.ChatOpenAI") as MockLLM:
                MockLLM.return_value.with_structured_output.return_value.ainvoke = mock_llm_chain
                state = {
                    **sample_agent_state,
                    "entry_mode": "url",
                    "offer_url": "https://example.com/job",
                }
                result = await scraper_node(state, mock_runnable_config)

        assert "selected_offer" in result
        offer = result["selected_offer"]
        assert offer["title"] == "Backend Engineer"
        assert offer["company"] == "TechCorp"
        assert offer["url"] == "https://example.com/job"
        assert result["status"] == "matching"

    @pytest.mark.asyncio
    async def test_scraper_returns_failed_if_no_url(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.scraper import scraper_node

        state = {**sample_agent_state, "offer_url": None}
        result = await scraper_node(state, mock_runnable_config)
        assert result["status"] == "failed"


# ---------------------------------------------------------------------------
# Matcher node
# ---------------------------------------------------------------------------


class TestMatcherNode:
    """Matcher calls embedding + LLM structured output — mocked."""

    @pytest.mark.asyncio
    async def test_matcher_produces_gap_report(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.matcher import GapAnalysisResult, matcher_node

        mock_result = GapAnalysisResult(
            match_score=82,
            matching_skills=["Python", "FastAPI", "PostgreSQL"],
            missing_skills=["Kubernetes"],
            summary="Strong match. Candidate has most required skills.",
        )
        mock_emb = [0.5] * 1536

        with patch(
            "app.graph.nodes.matcher._embed_pair", new=AsyncMock(return_value=(mock_emb, mock_emb))
        ):
            with patch("app.graph.nodes.matcher.ChatOpenAI") as MockLLM:
                MockLLM.return_value.with_structured_output.return_value.ainvoke = AsyncMock(
                    return_value=mock_result
                )
                result = await matcher_node(sample_agent_state, mock_runnable_config)

        assert "gap_report" in result
        assert "match_score" in result
        assert 0 <= result["match_score"] <= 100
        assert "matching_skills" in result["gap_report"]
        assert "missing_skills" in result["gap_report"]

    @pytest.mark.asyncio
    async def test_matcher_blends_scores(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        """Final score = 60% LLM + 40% embedding."""
        from app.graph.nodes.matcher import GapAnalysisResult, matcher_node

        # Perfect cosine similarity (same vector) → embedding_score = 100
        mock_emb = [1.0] + [0.0] * 1535

        mock_result = GapAnalysisResult(
            match_score=60,  # LLM says 60
            matching_skills=["Python"],
            missing_skills=[],
            summary="Good match.",
        )

        with patch(
            "app.graph.nodes.matcher._embed_pair", new=AsyncMock(return_value=(mock_emb, mock_emb))
        ):
            with patch("app.graph.nodes.matcher.ChatOpenAI") as MockLLM:
                MockLLM.return_value.with_structured_output.return_value.ainvoke = AsyncMock(
                    return_value=mock_result
                )
                result = await matcher_node(sample_agent_state, mock_runnable_config)

        # 60% * 60 + 40% * 100 = 36 + 40 = 76
        assert result["match_score"] == 76


# ---------------------------------------------------------------------------
# Writer node
# ---------------------------------------------------------------------------


class TestWriterNode:
    """Writer calls ChatOpenAI — mocked."""

    @pytest.mark.asyncio
    async def test_writer_generates_letter(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.writer import writer_node

        mock_response = MagicMock()
        mock_response.content = (
            "Dear Hiring Manager,\n\n"
            "I am excited to apply for the Backend Engineer role at TechCorp. "
            "My 5 years of Python and FastAPI experience directly match your requirements.\n\n"
            "Best regards,\nJane Doe"
        )

        with patch("app.graph.nodes.writer.ChatOpenAI") as MockLLM:
            MockLLM.return_value.ainvoke = AsyncMock(return_value=mock_response)
            state = {**sample_agent_state, "revision_count": 0}
            result = await writer_node(state, mock_runnable_config)

        assert "draft_letter" in result
        assert len(result["draft_letter"]) > 50
        assert result["revision_count"] == 1
        assert result["status"] == "writing"

    @pytest.mark.asyncio
    async def test_writer_increments_revision_count(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.writer import writer_node

        mock_response = MagicMock()
        mock_response.content = "Revised cover letter content here."

        with patch("app.graph.nodes.writer.ChatOpenAI") as MockLLM:
            MockLLM.return_value.ainvoke = AsyncMock(return_value=mock_response)
            state = {**sample_agent_state, "revision_count": 2}
            result = await writer_node(state, mock_runnable_config)

        assert result["revision_count"] == 3

    @pytest.mark.asyncio
    async def test_writer_includes_revision_context_when_revising(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.writer import writer_node

        captured_messages = []

        async def capture_ainvoke(messages):
            captured_messages.extend(messages)
            resp = MagicMock()
            resp.content = "Improved cover letter."
            return resp

        with patch("app.graph.nodes.writer.ChatOpenAI") as MockLLM:
            MockLLM.return_value.ainvoke = capture_ainvoke
            state = {
                **sample_agent_state,
                "revision_count": 1,
                "critic_feedback": {"feedback": "Add more numbers and metrics."},
            }
            await writer_node(state, mock_runnable_config)

        # At least one message should mention the revision/feedback
        all_content = " ".join(m.content for m in captured_messages)
        assert "feedback" in all_content.lower() or "revision" in all_content.lower()


# ---------------------------------------------------------------------------
# Critic node
# ---------------------------------------------------------------------------


class TestCriticNode:
    """Critic calls ChatOpenAI with_structured_output — mocked."""

    @pytest.mark.asyncio
    async def test_critic_returns_scores(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.critic import CriticEvaluation, critic_node

        mock_eval = CriticEvaluation(
            relevance=85,
            tone=80,
            structure=78,
            specificity=72,
            persuasiveness=82,
            overall=80,
            feedback="Good letter. Add specific metrics from your Acme Corp role.",
        )

        with patch("app.graph.nodes.critic.ChatOpenAI") as MockLLM:
            MockLLM.return_value.with_structured_output.return_value.ainvoke = AsyncMock(
                return_value=mock_eval
            )
            result = await critic_node(sample_agent_state, mock_runnable_config)

        assert result["critic_score"] == 80
        assert "feedback" in result["critic_feedback"]
        assert result["status"] == "critiquing"

    @pytest.mark.asyncio
    async def test_critic_returns_fallback_on_llm_error(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.critic import critic_node

        with patch("app.graph.nodes.critic.ChatOpenAI") as MockLLM:
            MockLLM.return_value.with_structured_output.return_value.ainvoke = AsyncMock(
                side_effect=Exception("LLM timeout")
            )
            result = await critic_node(sample_agent_state, mock_runnable_config)

        # Fallback score is 70
        assert result["critic_score"] == 70
        assert "unavailable" in result["critic_feedback"]["feedback"].lower()


# ---------------------------------------------------------------------------
# HITL nodes
# ---------------------------------------------------------------------------


class TestHITLNodes:
    """HITL nodes use interrupt() — we test the state they return after resume."""

    @pytest.mark.asyncio
    async def test_hitl1_resumes_with_selected_offer(
        self, sample_agent_state: dict, mock_runnable_config: dict, sample_offer: dict
    ) -> None:
        from app.graph.nodes.hitl import hitl1_node

        with patch("app.graph.nodes.hitl.interrupt", return_value=sample_offer):
            result = await hitl1_node(sample_agent_state, mock_runnable_config)

        assert result["selected_offer"] == sample_offer
        assert result["status"] == "matching"

    @pytest.mark.asyncio
    async def test_hitl2_uses_edited_letter_if_provided(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.hitl import hitl2_node

        edited = "Edited cover letter by the user."
        with patch("app.graph.nodes.hitl.interrupt", return_value={"edited_letter": edited}):
            result = await hitl2_node(sample_agent_state, mock_runnable_config)

        assert result["final_letter"] == edited
        assert result["status"] == "completed"

    @pytest.mark.asyncio
    async def test_hitl2_falls_back_to_draft_if_no_edit(
        self, sample_agent_state: dict, mock_runnable_config: dict
    ) -> None:
        from app.graph.nodes.hitl import hitl2_node

        # User approved without editing (empty edited_letter)
        with patch("app.graph.nodes.hitl.interrupt", return_value={"edited_letter": ""}):
            result = await hitl2_node(sample_agent_state, mock_runnable_config)

        # Should fall back to the draft
        assert result["final_letter"] == sample_agent_state["draft_letter"]
