"""Scout node — searches for job offers using Tavily (explore mode).

Improvements:
- ATS-aware company name extraction from URLs (Greenhouse, Lever, etc.)
- Batch LLM extraction for company names from search snippets
- Content snippet validation to skip obviously unavailable postings
"""

import asyncio
import logging
import uuid
import re

from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models.state import AgentState
from app.tools.embedding_tools import embed_text
from app.tools.tavily_tools import search_jobs
from app.graph.pubsub import log_emitter

logger = logging.getLogger(__name__)

SCOUT_QUERY_TEMPLATES = [
    "{job_title} {skills} {location} {contract_type} career posting",
    "{job_title} {location} {contract_type} job apply",
    "{skills} {location} job opening",
]

# ---------------------------------------------------------------------------
# URL filtering
# ---------------------------------------------------------------------------


def _is_valid_job_url(url: str) -> bool:
    """Filter out search pages, aggregators, and generic lists."""
    url_lower = url.lower()

    # Obvious search pages & irrelevant endpoints
    invalid_patterns = [
        r"/search",
        r"jobs\?q=",
        r"jobs\?l=",
        r"job-search",
        r"/jobs/list",
        r"/results",
        r"/category/",
        r"/categories/",
        r"linkedin\.com/jobs/search",
        r"linkedin\.com/in/",          # LinkedIn profiles
        r"linkedin\.com/company/",     # LinkedIn company pages
        r"linkedin\.com/pulse/",       # LinkedIn articles
        r"linkedin\.com/posts/",       # LinkedIn posts
        r"glassdoor\.com/job-site",
        r"glassdoor\.com/job-search",
        r"glassdoor\.com/overview/",   # Glassdoor company pages
        r"glassdoor\.com/reviews/",    # Glassdoor reviews
        r"glassdoor\.com/salary/",     # Glassdoor salaries
    ]
    for pattern in invalid_patterns:
        if bool(re.search(pattern, url_lower)):
            return False

    # Positive hits constraints (ATS specifically usually point to a single job if they have an ID)
    if "linkedin.com" in url_lower and "/jobs/view/" not in url_lower:
        return False
    if "glassdoor.com" in url_lower and "/job-listing/" not in url_lower and "joblisting" not in url_lower:
        return False
    if "greenhouse.io" in url_lower and "/jobs/" not in url_lower:
        return False
    if "lever.co" in url_lower and len(url_lower.split("/")) < 5:
        # normally jobs.lever.co/company/ID
        return False

    return True


# ---------------------------------------------------------------------------
# Content-level snippet validation
# ---------------------------------------------------------------------------

_UNAVAILABLE_SNIPPET_PATTERNS = re.compile(
    r"(no\s+longer\s+(available|open|accepting)|"
    r"position\s+(has\s+been\s+)?(filled|closed|removed)|"
    r"(listing|posting)\s+(has\s+)?(expired|been\s+removed)|"
    r"opportunity\s+(is\s+)?(closed|no\s+longer)|"
    r"application\s+(period|window)\s+(has\s+)?(closed|ended|expired)|"
    r"404\s*[-–—]\s*(page|not\s+found)|"
    r"job\s+not\s+found|"
    # Lever-specific
    r"couldn't\s+find\s+anything\s+here|"
    r"(posting|job)\s+you'?r?e?\s+looking\s+for\s+(might\s+have\s+)?(closed|been\s+removed)|"
    r"sorry,?\s+we\s+couldn't\s+find|"
    # Ashby / generic not-found
    r"(the\s+)?job\s+(you\s+(requested|are\s+looking\s+for)\s+)?(was\s+)?not\s+found|"
    r"it\s+has\s+been\s+(removed|closed|taken\s+down))",
    re.IGNORECASE,
)


def _is_snippet_available(content: str) -> bool:
    """Quick check if a search result snippet indicates an unavailable position."""
    return not bool(_UNAVAILABLE_SNIPPET_PATTERNS.search(content[:500]))


# ---------------------------------------------------------------------------
# ATS-aware company name extraction from URL
# ---------------------------------------------------------------------------

# Maps ATS domain patterns to the URL path segment index containing the company name.
_ATS_DOMAIN_MAP: dict[str, int] = {
    "boards.greenhouse.io": 1,      # boards.greenhouse.io/COMPANY/jobs/123
    "job-boards.greenhouse.io": 1,   # job-boards.greenhouse.io/COMPANY/jobs/123
    "jobs.lever.co": 1,              # jobs.lever.co/COMPANY/uuid
    "jobs.ashbyhq.com": 1,           # jobs.ashbyhq.com/COMPANY/uuid
    "apply.workable.com": 1,         # apply.workable.com/COMPANY/j/uuid
    "careers.smartrecruiters.com": 1, # careers.smartrecruiters.com/COMPANY/uuid
    "jobs.jobvite.com": 2,           # jobs.jobvite.com/COMPANY/job/uuid (varies)
}


def _extract_company_from_url(url: str) -> str:
    """ATS-aware company name extraction from URL.

    Handles major ATS platforms where the company name is embedded in the URL path.
    Falls back to domain-based extraction for direct career pages.

    Examples:
        boards.greenhouse.io/stripe/jobs/123   → Stripe
        jobs.lever.co/figma/abc-123            → Figma
        apply.workable.com/notion/j/...        → Notion
        careers.acme.com/jobs/123              → Acme
    """
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        host = parsed.netloc.lower().replace("www.", "")
        path_parts = [p for p in parsed.path.strip("/").split("/") if p]

        # Check ATS domains
        for ats_domain, segment_idx in _ATS_DOMAIN_MAP.items():
            if host == ats_domain and len(path_parts) > (segment_idx - 1):
                company = path_parts[segment_idx - 1]
                # Clean up: remove hyphens/underscores and title-case
                return company.replace("-", " ").replace("_", " ").title()

        # Non-ATS direct career pages: use domain name
        # e.g. careers.stripe.com → Stripe, jobs.acme.io → Acme
        if not host:
            return "Unknown"
            
        domain_parts = host.split(".")
        if len(domain_parts) >= 2:
            # Skip common subdomains
            skip = {"careers", "jobs", "apply", "hire", "recruiting", "talent", "work"}
            for part in domain_parts:
                if part not in skip and part not in {"com", "org", "io", "co", "net", "fr", "de", "uk"}:
                    return part.replace("-", " ").title()

        return domain_parts[0].capitalize() if domain_parts[0] else "Unknown"
    except Exception:
        return "Unknown"


# ---------------------------------------------------------------------------
# Batch LLM company name extraction from search snippets
# ---------------------------------------------------------------------------


class ScoutCompanyExtraction(BaseModel):
    """Batch extraction of company names from search result snippets."""

    companies: list[str] = Field(
        description="List of company names extracted from the snippets, in the same order as provided. "
        "Use 'Unknown' if a company name cannot be determined."
    )


async def _batch_extract_companies(
    offers: list[dict],
) -> list[str]:
    """Use fast_model to batch-extract company names from search snippets.

    Sends all snippets in a single LLM call for cost efficiency.
    Falls back to URL-based extraction if LLM fails.
    """
    if not offers:
        return []

    # Build the prompt with numbered snippets
    snippet_lines = []
    for i, offer in enumerate(offers, 1):
        url = offer.get("url", "")
        title = offer.get("title", "")
        content = offer.get("snippet", "")[:200]
        snippet_lines.append(f"{i}. URL: {url}\n   Title: {title}\n   Content: {content}")

    snippets_text = "\n\n".join(snippet_lines)

    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.fast_model,
        api_key=settings.openai_api_key,
        temperature=0,
    )
    structured_llm = llm.with_structured_output(ScoutCompanyExtraction)

    prompt = (
        "Extract the REAL hiring company name from each numbered job posting snippet below.\n"
        "IMPORTANT: The company name is the organization that is hiring, NOT the job board or "
        "ATS platform (e.g. Greenhouse, Lever, Workable, LinkedIn, Glassdoor are platforms).\n"
        "Look at the title, URL path (e.g. boards.greenhouse.io/COMPANY/...), and content.\n"
        "Return exactly one company name per snippet, in the same order.\n"
        "Use 'Unknown' if you cannot determine the company.\n\n"
        f"SNIPPETS:\n{snippets_text}"
    )

    try:
        result: ScoutCompanyExtraction = await structured_llm.ainvoke(
            [SystemMessage(content=prompt)],
            config={"metadata": {"node": "scout", "model_tier": "fast"}},
        )
        companies = result.companies

        # Pad or truncate to match offer count
        while len(companies) < len(offers):
            companies.append("Unknown")
        return companies[:len(offers)]

    except Exception as exc:
        logger.warning("Scout: batch company extraction failed: %s", exc)
        # Fallback: URL-based extraction
        return [_extract_company_from_url(o.get("url", "")) for o in offers]


# ---------------------------------------------------------------------------
# Main scout node
# ---------------------------------------------------------------------------


async def scout_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """Search for relevant job offers based on CV and user preferences.

    Query is built from CV structured data + user search preferences.
    Results are pre-scored using embedding cosine similarity against the full CV.
    Company names are extracted via batch LLM call for accuracy.
    """
    logger.info("Scout: searching offers for run=%s", state.get("run_id"))
    await log_emitter.emit(state.get("run_id"), {"type": "info", "message": "Scout: Initiating web search for job offers..."})

    cv_structured = state.get("cv_structured", {})
    prefs = state.get("search_preferences", {})

    # Build search query from CV + preferences
    skills = ", ".join((cv_structured.get("skills") or [])[:5])
    job_title = prefs.get("job_title") or (cv_structured.get("summary") or "")[:100]
    location = prefs.get("location", "")
    contract_type = prefs.get("contract_type", "")

    # Prepare context for filtering out already processed jobs
    from app.dependencies import create_supabase_client
    from app.memory.store import get_user_memory
    settings = get_settings()
    supabase = await create_supabase_client(settings)
    user_id = state.get("user_id", "")
    history = await get_user_memory(supabase, user_id, "application_history")
    
    past_urls = set()
    past_roles_companies = set()
    if history and "applications" in history:
        for app in history["applications"]:
            if app.get("url"):
                past_urls.add(app["url"])
            if app.get("company") and app.get("role"):
                past_roles_companies.add((app["company"].lower(), app["role"].lower()))

    # Calculate CV Embedding once
    cv_text = state.get("cv_text", "")
    async def _empty_list(): return []
    cv_embedding = await (embed_text(cv_text[:2000]) if cv_text else _empty_list())

    include_domains = [
        "boards.greenhouse.io",
        "jobs.lever.co",
        "jobs.ashbyhq.com",
        "apply.workable.com",
        "careers.smartrecruiters.com"
    ]

    available_results = []
    raw_results = []
    filtered_results = []

    for template in SCOUT_QUERY_TEMPLATES:
        query = template.format(
            job_title=job_title,
            skills=skills,
            location=location,
            contract_type=contract_type,
        ).strip()

        logger.info("Scout: query='%s'", query[:120])
        await log_emitter.emit(state.get("run_id"), {"type": "agent_action", "message": f"Scout querying Tavily: '{query[:80]}...'"})

        raw_results = await search_jobs(query, max_results=25, include_domains=include_domains)
        filtered_results = [r for r in raw_results if _is_valid_job_url(r.get("url", ""))]

        novel_results = []
        for r in filtered_results:
            url = r.get("url", "")
            if url in past_urls:
                continue
            title = r.get("title", "").lower()
            company = _extract_company_from_url(url).lower()
            if (company, title) in past_roles_companies and company != "unknown":
                continue
            novel_results.append(r)

        for r in novel_results:
            content = r.get("content", "")
            if _is_snippet_available(content):
                available_results.append(r)
            else:
                logger.debug("Scout: skipping unavailable posting: %s", r.get("url", "")[:80])

        if len(available_results) > 0:
            break
        else:
            await log_emitter.emit(state.get("run_id"), {"type": "info", "message": "Scout: 0 novel valid jobs found. Expanding search strategy..."})

    available_results = available_results[:10]  # Take top 10 valid results

    await log_emitter.emit(state.get("run_id"), {
        "type": "info",
        "message": (
            f"Scout: Found {len(available_results)} valid individual job postings "
            f"({len(raw_results)} total raw, {len(filtered_results)} after URL filter)."
        ),
    })
    await log_emitter.emit(state.get("run_id"), {"type": "info", "message": "Scout: Generating embeddings to pre-score semantic match..."})

    # Pre-score all results (batch embed content fields)
    contents = [r.get("content", "") for r in available_results]
    if cv_embedding and any(contents):
        try:
            from app.tools.embedding_tools import embed_texts
            offer_embeddings = await embed_texts([c[:1000] for c in contents])
        except Exception as exc:
            logger.warning("Scout: batch embedding failed: %s", exc)
            offer_embeddings = [[] for _ in contents]
    else:
        offer_embeddings = [[] for _ in contents]

    # Batch extract company names via LLM (single cheap call for all offers)
    await log_emitter.emit(state.get("run_id"), {"type": "agent_action", "message": "Scout: Extracting company names from search results..."})

    # Build preliminary offers for company extraction
    preliminary_offers = []
    for result, content in zip(available_results, contents):
        preliminary_offers.append({
            "url": result.get("url", ""),
            "title": result.get("title", "Unknown"),
            "snippet": content[:200],
        })

    company_names = await _batch_extract_companies(preliminary_offers)

    # Assemble final offers with scores and company names
    offers: list[dict] = []
    seen_urls: set[str] = set()  # Dedup: Tavily may return the same URL across search slices
    for idx, (result, content, offer_emb) in enumerate(zip(available_results, contents, offer_embeddings)):
        url = result.get("url", "")
        if url in seen_urls:
            logger.debug("Scout: skipping duplicate URL %s", url)
            continue
        seen_urls.add(url)

        if cv_embedding and offer_emb:
            score = _cosine_similarity_pct(cv_embedding, offer_emb)
        else:
            # Fall back to Tavily's own score (0–1 range)
            score = float(result.get("score", 0.5)) * 100

        # Use LLM-extracted company name, fall back to URL-based
        company = (
            company_names[idx]
            if idx < len(company_names) and company_names[idx] != "Unknown"
            else _extract_company_from_url(url)
        )

        offers.append({
            "id": str(uuid.uuid4()),
            "title": result.get("title", "Unknown"),
            "company": company,
            "url": url,
            "snippet": content[:300],
            "contact_email": None,
            "pre_score": round(score, 1),
            "location": location or None,
        })

    offers.sort(key=lambda x: x["pre_score"], reverse=True)
    logger.info("Scout: found %d offers for run=%s", len(offers), state.get("run_id"))
    await log_emitter.emit(state.get("run_id"), {"type": "info", "message": f"Scout: Found and scored {len(offers)} offers."})

    return {
        "discovered_offers": offers,
        "status": "scouting",
    }


def _cosine_similarity_pct(a: list[float], b: list[float]) -> float:
    """Cosine similarity scaled to 0–100."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x**2 for x in a) ** 0.5
    norm_b = sum(x**2 for x in b) ** 0.5
    return (dot / (norm_a * norm_b) * 100) if norm_a and norm_b else 50.0
