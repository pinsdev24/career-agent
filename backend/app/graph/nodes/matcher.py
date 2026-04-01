"""Matcher node — semantic gap analysis between CV and job offer."""

import logging

from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import get_settings
from app.graph.pubsub import log_emitter
from app.models.state import AgentState
from app.tools.embedding_tools import embed_text

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Structured output schema
# ---------------------------------------------------------------------------


class GapAnalysisResult(BaseModel):
    """Structured gap analysis output from the LLM."""

    match_score: int = Field(ge=0, le=100, description="Overall match score 0-100")
    matching_skills: list[str] = Field(
        default_factory=list,
        description="Skills the candidate has that match the offer",
    )
    missing_skills: list[str] = Field(
        default_factory=list,
        description="Skills required by the offer that the candidate lacks",
    )
    summary: str = Field(
        description="2-3 sentence analysis highlighting strengths and gaps",
    )


SYSTEM_PROMPT = (
    "You are an expert career advisor. Perform a rigorous gap analysis between "
    "the candidate's CV and the job offer. Be objective and specific."
)


async def matcher_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """Perform semantic gap analysis between CV and selected offer.

    Blends embedding cosine similarity (40%) + LLM structured analysis (60%)
    for a reliable match score.
    """
    cv_text = state.get("cv_text", "")
    selected_offer = state.get("selected_offer", {})
    offer_text = selected_offer.get("raw_text", "") or selected_offer.get("snippet", "")

    logger.info("Matcher: analyzing gap for run=%s", state.get("run_id"))
    await log_emitter.emit(
        state.get("run_id"), {"type": "info", "message": "Matcher: Starting gap analysis..."}
    )
    await log_emitter.emit(
        state.get("run_id"),
        {
            "type": "agent_action",
            "message": "Matcher computing cosine similarity between CV and Offer...",
        },
    )

    # --- Embedding similarity (fast, approximate) ---
    embedding_score = 50.0
    if cv_text and offer_text:
        try:
            cv_emb, offer_emb = await _embed_pair(cv_text[:2000], offer_text[:2000])
            embedding_score = _cosine_similarity(cv_emb, offer_emb) * 100
        except Exception as exc:
            logger.warning("Matcher: embedding similarity failed: %s", exc)

    # --- LLM structured gap analysis ---
    await log_emitter.emit(
        state.get("run_id"),
        {
            "type": "agent_action",
            "message": "Matcher passing CV and Offer to LLM for rigorous gap analysis...",
        },
    )
    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.openai_api_key,
        temperature=0,
    )
    structured_llm = llm.with_structured_output(GapAnalysisResult)

    try:
        result: GapAnalysisResult = await structured_llm.ainvoke(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                SystemMessage(
                    content=(
                        f"CANDIDATE CV:\n{cv_text[:4000]}\n\n" f"JOB OFFER:\n{offer_text[:4000]}"
                    )
                ),
            ]
        )
    except Exception as exc:
        logger.warning("Matcher: structured output failed: %s", exc)
        result = GapAnalysisResult(
            match_score=int(embedding_score),
            summary="Gap analysis unavailable — using embedding similarity.",
        )

    # Blend scores: 60% LLM + 40% embedding
    final_score = int(0.6 * result.match_score + 0.4 * embedding_score)
    gap_report = result.model_dump()
    gap_report["match_score"] = final_score

    logger.info(
        "Matcher: score=%d (llm=%d, emb=%.1f) for run=%s",
        final_score,
        result.match_score,
        embedding_score,
        state.get("run_id"),
    )
    await log_emitter.emit(
        state.get("run_id"),
        {
            "type": "info",
            "message": f"Matcher: Final semantic match score calculated at {final_score}%.",
        },
    )

    return {
        "gap_report": gap_report,
        "match_score": final_score,
        "status": "matching",
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _embed_pair(text_a: str, text_b: str) -> tuple[list[float], list[float]]:
    """Embed two texts concurrently."""
    import asyncio

    emb_a, emb_b = await asyncio.gather(embed_text(text_a), embed_text(text_b))
    return emb_a, emb_b


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x**2 for x in a) ** 0.5
    norm_b = sum(x**2 for x in b) ** 0.5
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0
