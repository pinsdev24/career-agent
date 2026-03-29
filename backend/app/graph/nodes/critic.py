"""Critic node — evaluates cover letters on 5 dimensions."""

import logging

from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models.state import AgentState
from app.graph.pubsub import log_emitter

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Structured output schema
# ---------------------------------------------------------------------------


class CriticEvaluation(BaseModel):
    """5-dimension cover letter evaluation."""

    relevance: int = Field(ge=0, le=100, description="Addresses specific job requirements")
    tone: int = Field(ge=0, le=100, description="Appropriate and consistent tone")
    structure: int = Field(ge=0, le=100, description="Well-organized with clear flow")
    specificity: int = Field(ge=0, le=100, description="Concrete examples and details")
    persuasiveness: int = Field(ge=0, le=100, description="Would motivate a recruiter to call")
    overall: int = Field(ge=0, le=100, description="Weighted overall score")
    feedback: str = Field(description="Specific, actionable improvement suggestions")


SYSTEM_PROMPT = (
    "You are a senior HR director with 20 years of experience reviewing cover letters. "
    "Evaluate the letter critically and honestly against the job requirements. "
    "Weight the overall score: relevance 30%, persuasiveness 25%, specificity 20%, "
    "tone 15%, structure 10%."
)


async def critic_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """Evaluate the cover letter on 5 dimensions using structured output.

    Routes to writer (retry) if overall < threshold, else to HITL-2.
    """
    letter = state.get("draft_letter", "")
    offer = state.get("selected_offer", {})
    structured_offer = offer.get("structured", {})

    required_skills = structured_offer.get("required_skills") or \
        state.get("gap_report", {}).get("missing_skills", [])

    logger.info(
        "Critic: evaluating letter (revision=%d) for run=%s",
        state.get("revision_count", 0),
        state.get("run_id"),
    )
    await log_emitter.emit(state.get("run_id"), {"type": "info", "message": "Critic: Evaluating draft letter against 5 quality dimensions..."})

    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.openai_api_key,
        temperature=0,
    )
    structured_llm = llm.with_structured_output(CriticEvaluation)

    offer_context = (
        f"Title: {offer.get('title', 'Unknown')}\n"
        f"Company: {offer.get('company', 'Unknown')}\n"
        f"Required skills: {', '.join(required_skills) if required_skills else 'not specified'}"
    )

    await log_emitter.emit(state.get("run_id"), {"type": "agent_action", "message": "Critic analyzing letter relevance, tone, persuasiveness..."})

    try:
        evaluation: CriticEvaluation = await structured_llm.ainvoke(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                SystemMessage(
                    content=f"JOB OFFER:\n{offer_context}\n\nCOVER LETTER:\n{letter}"
                ),
            ]
        )
    except Exception as exc:
        logger.warning("Critic: structured output failed: %s — using fallback score", exc)
        evaluation = CriticEvaluation(
            relevance=70, tone=70, structure=70, specificity=70, persuasiveness=70,
            overall=70,
            feedback="Evaluation unavailable. Please review the letter manually.",
        )

    logger.info(
        "Critic: overall=%d (threshold=%d) for run=%s",
        evaluation.overall,
        settings.critic_threshold,
        state.get("run_id"),
    )
    await log_emitter.emit(state.get("run_id"), {"type": "info", "message": f"Critic: Overall score is {evaluation.overall} / 100."})

    return {
        "critic_score": evaluation.overall,
        "critic_feedback": evaluation.model_dump(),
        "status": "critiquing",
    }
