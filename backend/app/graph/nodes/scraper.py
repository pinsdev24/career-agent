"""Scraper node — extracts content from a job offer URL (URL mode)."""

import logging
import uuid

from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models.state import AgentState
from app.tools.tavily_tools import extract_url

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Structured output schema
# ---------------------------------------------------------------------------


class StructuredOffer(BaseModel):
    """LLM-structured representation of a job offer."""

    title: str = Field(description="Job title")
    company: str = Field(description="Company name")
    location: str | None = Field(None, description="Location of the role")
    contract_type: str | None = Field(None, description="e.g. CDI, CDD, freelance, internship")
    remote: str | None = Field(None, description="e.g. remote, onsite, hybrid")
    required_skills: list[str] = Field(default_factory=list)
    nice_to_have_skills: list[str] = Field(default_factory=list)
    experience_level: str | None = Field(None, description="e.g. junior, mid, senior")
    description: str = Field(description="Brief summary of the role")
    salary: str | None = Field(None)


SYSTEM_PROMPT = (
    "You are an expert at extracting structured information from job postings. "
    "Extract all available information accurately. If a field is not present, return null."
)


async def scraper_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """Extract and structure a job offer from its URL.

    Uses Tavily extract API + LLM with structured output (no JSON parsing).
    """
    offer_url = state.get("offer_url")
    if not offer_url:
        logger.error("Scraper: no offer_url in state for run=%s", state.get("run_id"))
        return {"status": "failed"}

    logger.info("Scraper: extracting %s for run=%s", offer_url, state.get("run_id"))

    # Extract raw content via Tavily
    extracted = await extract_url(offer_url)
    raw_content = extracted.get("raw_content", "")

    # Structure via LLM with_structured_output — no JSON parsing needed
    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.openai_api_key,
        temperature=0,
    )
    structured_llm = llm.with_structured_output(StructuredOffer)

    try:
        structured: StructuredOffer = await structured_llm.ainvoke(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                SystemMessage(content=f"JOB OFFER TEXT:\n{raw_content[:6000]}"),
            ]
        )
    except Exception as exc:
        logger.warning("Scraper: structured output failed (%s), using defaults", exc)
        structured = StructuredOffer(
            title="Unknown",
            company="Unknown",
            description=raw_content[:500],
        )

    selected_offer = {
        "id": str(uuid.uuid4()),
        "title": structured.title,
        "company": structured.company,
        "url": offer_url,
        "location": structured.location,
        "snippet": raw_content[:300],
        "pre_score": 0,
        "raw_text": raw_content,
        "structured": structured.model_dump(),
    }

    logger.info(
        "Scraper: extracted '%s' @ %s for run=%s",
        selected_offer["title"],
        selected_offer["company"],
        state.get("run_id"),
    )

    return {
        "selected_offer": selected_offer,
        "status": "matching",
    }
