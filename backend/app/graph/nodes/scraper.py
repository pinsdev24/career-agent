"""Scraper node — extracts content from a job offer URL (URL mode).

Improvements:
- Uses fast_model (gpt-5-nano) for structured extraction (cost-efficient)
- Multi-layer content validation (regex pre-check + LLM availability detection)
- Rich CompanyInfo extraction (name, website, industry, size)
"""

import logging
import re
import uuid

from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import get_settings
from app.exceptions import OfferUnavailableError
from app.models.state import AgentState
from app.tools.retry import async_retry
from app.tools.tavily_tools import extract_url
from app.graph.pubsub import log_emitter

logger = logging.getLogger(__name__)


@async_retry(max_retries=2, backoff_base=1.5)
async def _extract_offer_url(url: str) -> dict:
    """Retry-wrapped Tavily URL extraction."""
    return await extract_url(url)


@async_retry(max_retries=2, backoff_base=1.0)
async def _invoke_scraper_llm(structured_llm: object, messages: list, run_id: str) -> object:
    """Retry-wrapped offer structuring LLM call."""
    return await structured_llm.ainvoke(  # type: ignore[union-attr]
        messages,
        config={"metadata": {"node": "scraper", "run_id": run_id, "model_tier": "fast"}},
    )


# ---------------------------------------------------------------------------
# Content-level pre-validation (regex — skips LLM if obviously unavailable)
# ---------------------------------------------------------------------------

_UNAVAILABLE_PATTERNS = [
    # Generic position-no-longer-available
    r"this\s+(position|job|role|posting)\s+(is\s+)?(no\s+longer|not)\s+(available|open|active|accepting)",
    r"(position|job|role|posting)\s+has\s+been\s+(filled|closed|removed|taken\s+down)",
    r"(position|job|role)\s+(has\s+)?expired",
    r"this\s+(listing|posting)\s+has\s+(expired|been\s+removed|been\s+closed)",
    r"sorry.*?(no\s+longer\s+accepting\s+applications|position.*?(filled|closed))",
    r"job\s+not\s+found",
    r"the\s+page\s+you('re|\s+are)\s+looking\s+for\s+(doesn't|does\s+not)\s+exist",
    r"404\s*[-–—]\s*(page|not\s+found)",
    r"this\s+job\s+(is|has\s+been)\s+(no\s+longer\s+)?available",
    r"we('re|\s+are)\s+no\s+longer\s+accepting\s+applications",
    r"this\s+opportunity\s+(is\s+)?(closed|no\s+longer)",
    r"application\s+(period|window)\s+(has\s+)?(closed|ended|expired)",
    # Lever: "Sorry, we couldn't find anything here / might have closed / been removed"
    r"couldn't\s+find\s+anything\s+here",
    r"(posting|job)\s+you'?r?e?\s+looking\s+for\s+(might\s+have\s+)?(closed|been\s+removed|been\s+taken\s+down)",
    r"sorry,?\s+we\s+couldn't\s+find\s+(anything|it|the\s+job|that\s+job)",
    # Ashby / generic: "Job not found / The job you requested was not found"
    r"(the\s+)?job\s+(you\s+(requested|are\s+looking\s+for)\s+)?(was\s+)?not\s+found",
    r"(the\s+)?job\s+you\s+requested\s+was\s+not\s+found",
    # Generic "has been removed" without explicit subject word
    r"it\s+has\s+been\s+(removed|closed|taken\s+down)",
    r"(has|have)\s+been\s+(removed|closed|taken\s+down)\s+by\s+the\s+(employer|company|poster)",
]

_UNAVAILABLE_REGEX = re.compile(
    "|".join(f"({p})" for p in _UNAVAILABLE_PATTERNS),
    re.IGNORECASE,
)


def _check_content_availability(raw_content: str) -> tuple[bool, str | None]:
    """Pre-check if content indicates an unavailable position.

    Returns (is_available, reason). Checks only the first 2000 chars
    since availability notices are typically at the top of the page.
    """
    snippet = raw_content[:2000]
    match = _UNAVAILABLE_REGEX.search(snippet)
    if match:
        return False, match.group(0).strip()
    return True, None


# ---------------------------------------------------------------------------
# Structured output schemas
# ---------------------------------------------------------------------------


class CompanyInfo(BaseModel):
    """Structured company information extracted from job posting."""

    name: str = Field(description="Official company name (NOT the ATS platform like Greenhouse, Lever, Workable)")
    website: str | None = Field(
        None,
        description="Company official website URL (e.g. https://stripe.com), not the job board URL",
    )
    industry: str | None = Field(None, description="Company industry/sector (e.g. fintech, healthcare, SaaS)")
    size: str | None = Field(
        None,
        description="Company size if mentioned (e.g. startup, 50-200 employees, enterprise)",
    )
    description: str | None = Field(
        None,
        description="Brief company description from the posting (1-2 sentences max)",
    )


class StructuredOffer(BaseModel):
    """LLM-structured representation of a job offer."""

    title: str = Field(description="Job title")
    company_info: CompanyInfo = Field(description="Structured company information")
    location: str | None = Field(None, description="Location of the role")
    contract_type: str | None = Field(None, description="e.g. CDI, CDD, freelance, internship")
    remote: str | None = Field(None, description="e.g. remote, onsite, hybrid")
    required_skills: list[str] = Field(default_factory=list)
    nice_to_have_skills: list[str] = Field(default_factory=list)
    experience_level: str | None = Field(None, description="e.g. junior, mid, senior")
    description: str = Field(description="Brief summary of the role")
    salary: str | None = Field(None)
    contact_email: str | None = Field(None, description="Contact email for applications if found")
    is_available: bool = Field(
        True,
        description=(
            "Set to false if the page indicates the position is no longer available, "
            "filled, expired, closed, or not accepting applications"
        ),
    )
    unavailable_reason: str | None = Field(
        None,
        description="If is_available is false, explain why (e.g. 'position has been filled', 'listing expired')",
    )


SYSTEM_PROMPT = (
    "You are an expert at extracting structured information from job postings. "
    "Extract all available information accurately. If a field is not present, return null.\n\n"
    "CRITICAL RULES:\n"
    "1. COMPANY EXTRACTION: Extract the REAL company name — the organization hiring, NOT the ATS/job board "
    "platform (e.g. Greenhouse, Lever, Workable, SmartRecruiters, Ashby are platforms, not employers). "
    "Look for 'About us', 'About [Company]', or the company name in the job title/header.\n"
    "2. COMPANY WEBSITE: Extract the company's own website (e.g. stripe.com), NOT the job listing URL.\n"
    "3. AVAILABILITY CHECK: If the page content indicates the position is no longer available, "
    "filled, expired, closed, or not accepting applications, set is_available to false and "
    "explain in unavailable_reason. Still extract whatever info is visible.\n"
    "4. If the page content is clearly not a job posting (e.g. error page, login page, generic company page), "
    "set is_available to false with reason 'not a job posting'."
)


async def scraper_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """Extract and structure a job offer from its URL.

    Pipeline:
    1. Tavily extract API (raw content with HTTP validation)
    2. Regex pre-check for unavailable positions (skip LLM if obvious)
    3. LLM structured extraction with fast_model (cost-efficient)
    4. Post-extraction availability validation
    """
    offer_url = state.get("offer_url")
    if not offer_url:
        logger.error("Scraper: no offer_url in state for run=%s", state.get("run_id"))
        return {
            "status": "failed",
            "error_details": {"node": "scraper", "error": "No offer URL provided"},
        }

    run_id = state.get("run_id", "")
    logger.info("Scraper: extracting %s for run=%s", offer_url, run_id)
    await log_emitter.emit(run_id, {"type": "info", "message": "Scraper: Extracting content from URL..."})

    # Step 1: Extract raw content via Tavily (retried, with HTTP validation)
    try:
        extracted = await _extract_offer_url(offer_url)
    except Exception as exc:
        logger.error("Scraper: Tavily extraction failed for run=%s: %s", run_id, exc)
        await log_emitter.emit(run_id, {"type": "error", "message": f"Scraper: Failed to extract URL content — {exc}"})
        return {
            "status": "failed",
            "error_details": {
                "node": "scraper",
                "error": f"URL extraction failed: {exc}",
                "url": offer_url,
            },
        }

    raw_content = extracted.get("raw_content", "")

    # Step 2: Regex pre-check for obviously unavailable positions
    is_avail, unavail_reason = _check_content_availability(raw_content)
    if not is_avail:
        logger.warning(
            "Scraper: position unavailable (pre-check) for run=%s: %s",
            run_id, unavail_reason,
        )
        await log_emitter.emit(run_id, {
            "type": "error",
            "message": f"Scraper: Position appears unavailable — {unavail_reason}",
        })
        return {
            "status": "failed",
            "error_details": {
                "node": "scraper",
                "error": f"Position unavailable: {unavail_reason}",
                "url": offer_url,
            },
        }

    await log_emitter.emit(run_id, {"type": "agent_action", "message": "Scraper routing raw content to LLM for structured extraction..."})

    # Step 3: Structure via LLM with fast_model (cost-efficient extraction)
    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.fast_model,  # gpt-5-nano — cheap extraction
        api_key=settings.openai_api_key,
        temperature=0,
    )
    structured_llm = llm.with_structured_output(StructuredOffer)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        SystemMessage(content=f"JOB OFFER TEXT:\n{raw_content[:6000]}"),
    ]

    try:
        structured: StructuredOffer = await _invoke_scraper_llm(  # type: ignore[assignment]
            structured_llm, messages, run_id=run_id
        )
    except Exception as exc:
        logger.warning(
            "Scraper: structuring failed after retries for run=%s (%s), using defaults",
            run_id, exc,
        )
        structured = StructuredOffer(
            title="Unknown",
            company_info=CompanyInfo(name="Unknown"),
            description=raw_content[:500],
        )

    # Step 4: Post-extraction availability check (LLM detected unavailable)
    if not structured.is_available:
        reason = structured.unavailable_reason or "Position no longer available"
        logger.warning(
            "Scraper: LLM detected unavailable position for run=%s: %s",
            run_id, reason,
        )
        await log_emitter.emit(run_id, {
            "type": "error",
            "message": f"Scraper: Position unavailable — {reason}",
        })
        return {
            "status": "failed",
            "error_details": {
                "node": "scraper",
                "error": f"Position unavailable: {reason}",
                "url": offer_url,
                "detected_title": structured.title,
                "detected_company": structured.company_info.name,
            },
        }

    # Build the selected_offer dict with rich company info
    company_info_dict = structured.company_info.model_dump()

    selected_offer = {
        "id": str(uuid.uuid4()),
        "title": structured.title,
        "company": structured.company_info.name,  # Backward-compat flat field
        "company_info": company_info_dict,
        "url": offer_url,
        "location": structured.location,
        "contact_email": structured.contact_email,
        "snippet": raw_content[:300],
        "pre_score": 0,
        "raw_text": raw_content,
        "structured": structured.model_dump(),
    }

    logger.info(
        "Scraper: extracted '%s' @ %s for run=%s",
        selected_offer["title"],
        selected_offer["company"],
        run_id,
    )
    await log_emitter.emit(run_id, {
        "type": "info",
        "message": f"Scraper: Successfully extracted job profile for {structured.company_info.name}.",
    })

    return {
        "selected_offer": selected_offer,
        "status": "matching",
    }
