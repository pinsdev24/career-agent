"""Writer node — generates personalized cover letters."""

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from app.config import get_settings
from app.models.state import AgentState
from app.graph.pubsub import log_emitter

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are an expert cover letter writer with 15 years of experience helping "
    "candidates land interviews at top companies. You write compelling, specific, "
    "and persuasive letters that get responses."
)

WRITER_PROMPT = """Write a compelling, personalized cover letter with the following structure:

**TONE:** {tone}

**CANDIDATE PROFILE:**
{cv_text}

**JOB OFFER:**
Title: {offer_title}
Company: {offer_company}
Description: {offer_description}

**GAP ANALYSIS:**
- Matching skills: {matching_skills}
- Skills to address positively: {missing_skills}
- Overall assessment: {gap_summary}

{revision_context}

Structure the letter in three clear acts:
1. **Hook** — Open with a compelling connection between the candidate and this specific role/company
2. **Value Proposition** — 2-3 concrete examples of relevant experience that prove fit
3. **Call to Action** — Enthusiastic, confident close with a clear next step

Rules:
- Use the actual names (company, hiring manager if known) — NO placeholder brackets
- Be specific: reference real achievements, numbers, technologies from the CV
- Address any skill gaps as growth opportunities or transferable strengths
- {tone_instruction}
- Target length: 280-380 words
- Return ONLY the letter body (no "Subject:" or metadata)
"""

TONE_INSTRUCTIONS = {
    "professional": "Use formal but warm language; avoid contractions",
    "conversational": "Use natural, approachable language with light contractions",
    "enthusiastic": "Show genuine excitement; use energetic verbs and forward-looking language",
    "formal": "Use strictly formal register; no contractions; academic tone",
    "concise": "Be direct and punchy; every sentence earns its place; no filler phrases",
}

REVISION_CONTEXT_TEMPLATE = """
**REVISION {revision_count} — FEEDBACK TO ADDRESS:**
{feedback}

Improve the letter based on this feedback while preserving its key strengths.
Focus specifically on the issues raised above.
"""


async def writer_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """Generate a personalized cover letter.

    On first call: generates from scratch using CV + gap report + tone preference.
    On revisions: incorporates critic feedback while preserving strengths.
    """
    revision_count = state.get("revision_count", 0)
    logger.info(
        "Writer: generating letter (revision=%d) for run=%s",
        revision_count,
        state.get("run_id"),
    )
    await log_emitter.emit(state.get("run_id"), {"type": "info", "message": f"Writer: Drafting personalized cover letter (Revision {revision_count})..."})

    cv_text = state.get("cv_text", "")
    offer = state.get("selected_offer", {})
    gap = state.get("gap_report", {})
    tone = state.get("tone_of_voice", "professional")
    tone_instruction = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["professional"])

    # Build revision context if this is a retry
    revision_context = ""
    if revision_count > 0 and state.get("critic_feedback"):
        feedback = state["critic_feedback"]
        revision_context = REVISION_CONTEXT_TEMPLATE.format(
            revision_count=revision_count,
            feedback=feedback.get("feedback", str(feedback)),
        )

    await log_emitter.emit(state.get("run_id"), {"type": "agent_action", "message": "Writer instructing LLM with specific tone and gap context..."})
    settings = get_settings()
    llm = ChatOpenAI(
        base_url="https://api.moonshot.ai/v1",
        model=settings.writer_model,
        api_key=settings.moonshot_api_key,
        temperature=1,
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=WRITER_PROMPT.format(
            tone=tone,
            tone_instruction=tone_instruction,
            cv_text=cv_text[:4000],
            offer_title=offer.get("title", "Unknown"),
            offer_company=offer.get("company", "Unknown"),
            offer_description=(
                offer.get("structured", {}).get("description", "")
                or offer.get("snippet", "")
            )[:2000],
            matching_skills=", ".join(gap.get("matching_skills", [])) or "see CV",
            missing_skills=", ".join(gap.get("missing_skills", [])) or "none identified",
            gap_summary=gap.get("summary", "Strong candidate match."),
            revision_context=revision_context,
        )),
    ]

    response = await llm.ainvoke(messages)
    letter = response.content if isinstance(response.content, str) else ""

    logger.info(
        "Writer: %d-word letter generated (revision=%d) for run=%s",
        len(letter.split()),
        revision_count,
        state.get("run_id"),
    )
    await log_emitter.emit(state.get("run_id"), {"type": "info", "message": f"Writer: Generated a {len(letter.split())}-word cover letter."})

    return {
        "draft_letter": letter.strip(),
        "revision_count": revision_count + 1,
        "status": "writing",
    }
