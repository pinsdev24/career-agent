"""Matcher node — semantic gap analysis between CV and job offer."""

import logging

from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models.state import AgentState
from app.tools.embedding_tools import embed_text
from app.tools.retry import async_retry
from app.graph.pubsub import log_emitter

logger = logging.getLogger(__name__)


@async_retry(max_retries=2, backoff_base=1.0)
async def _invoke_gap_analysis(structured_llm: object, messages: list, run_id: str) -> object:
    """Retry-wrapped gap analysis LLM call."""
    return await structured_llm.ainvoke(  # type: ignore[union-attr]
        messages,
        config={"metadata": {"node": "matcher", "run_id": run_id, "model_tier": "fast"}},
    )


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
    await log_emitter.emit(state.get("run_id"), {"type": "info", "message": "Matcher: Starting gap analysis..."})
    await log_emitter.emit(state.get("run_id"), {"type": "agent_action", "message": "Matcher computing cosine similarity between CV and Offer..."})

    # --- Embedding similarity (fast, approximate) ---
    embedding_score = 50.0
    if cv_text and offer_text:
        try:
            cv_emb, offer_emb = await _embed_pair(cv_text[:2000], offer_text[:2000])
            embedding_score = _cosine_similarity(cv_emb, offer_emb) * 100
        except Exception as exc:
            logger.warning("Matcher: embedding similarity failed: %s", exc)

    # --- LLM structured gap analysis ---
    await log_emitter.emit(state.get("run_id"), {"type": "agent_action", "message": "Matcher passing CV and Offer to LLM for rigorous gap analysis..."})
    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.openai_api_key,
        temperature=0,
    )
    structured_llm = llm.with_structured_output(GapAnalysisResult)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        SystemMessage(
            content=(
                f"CANDIDATE CV:\n{cv_text[:4000]}\n\n"
                f"JOB OFFER:\n{offer_text[:4000]}"
            )
        ),
    ]

    try:
        result: GapAnalysisResult = await _invoke_gap_analysis(  # type: ignore[assignment]
            structured_llm, messages, run_id=state.get("run_id", "")
        )
    except Exception as exc:
        logger.warning(
            "Matcher: gap analysis failed after retries for run=%s: %s",
            state.get("run_id"), exc,
        )
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
    await log_emitter.emit(state.get("run_id"), {"type": "info", "message": f"Matcher: Final semantic match score calculated at {final_score}%."})

    # --- Generate compact summaries for downstream nodes ---
    # These replace raw CV/offer text in Writer and Critic prompts,
    # reducing token costs significantly on multi-revision runs.
    await log_emitter.emit(state.get("run_id"), {"type": "agent_action", "message": "Matcher: Generating context summaries for efficient processing..."})

    from app.tools.summarizer import summarize_cv, summarize_offer, summarize_gap_report  # noqa: E402

    cv_summary, offer_summary, gap_summary = await _generate_summaries(
        cv_text, selected_offer, gap_report
    )

    return {
        "gap_report": gap_report,
        "match_score": final_score,
        "cv_summary": cv_summary,
        "offer_summary": offer_summary,
        "gap_summary": gap_summary,
        "status": "matching",
    }


async def _generate_summaries(
    cv_text: str, offer: dict, gap_report: dict
) -> tuple[str, str, str]:
    """Generate all three summaries concurrently for speed."""
    import asyncio
    from app.tools.summarizer import summarize_cv, summarize_offer, summarize_gap_report

    try:
        cv_sum, offer_sum, gap_sum = await asyncio.gather(
            summarize_cv(cv_text),
            summarize_offer(offer),
            summarize_gap_report(gap_report),
        )
        return cv_sum, offer_sum, gap_sum
    except Exception as exc:
        logger.warning("Matcher: summary generation failed: %s", exc)
        # Fallback: truncated originals
        offer_text = offer.get("raw_text", "") or offer.get("snippet", "")
        return cv_text[:2000], offer_text[:1500], gap_report.get("summary", "")


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
