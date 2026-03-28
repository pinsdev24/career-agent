"""Scout node — searches for job offers using Tavily (explore mode)."""

import asyncio
import logging
import uuid
import re

from langchain_core.runnables import RunnableConfig

from app.models.state import AgentState
from app.tools.embedding_tools import embed_text
from app.tools.tavily_tools import search_jobs
from app.graph.pubsub import log_emitter

logger = logging.getLogger(__name__)

SCOUT_QUERY_TEMPLATE = "{job_title} {skills} {location} {contract_type} career posting"

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

async def scout_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """Search for relevant job offers based on CV and user preferences.

    Query is built from CV structured data + user search preferences.
    Results are pre-scored using embedding cosine similarity against the full CV.
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

    query = SCOUT_QUERY_TEMPLATE.format(
        job_title=job_title,
        skills=skills,
        location=location,
        contract_type=contract_type,
    ).strip()

    logger.info("Scout: query='%s'", query[:120])
    await log_emitter.emit(state.get("run_id"), {"type": "agent_action", "message": f"Scout querying Tavily specific job boards: '{query[:80]}...'"})

    # Fetch results and CV embedding concurrently
    cv_text = state.get("cv_text", "")
    
    include_domains = [
        "linkedin.com",
        "glassdoor.com",
        "boards.greenhouse.io",
        "jobs.lever.co",
        "jobs.ashbyhq.com",
        "apply.workable.com",
        "careers.smartrecruiters.com"
    ]
    
    async def _empty_list(): return []
    raw_results, cv_embedding = await asyncio.gather(
        search_jobs(query, max_results=25, include_domains=include_domains),
        embed_text(cv_text[:2000]) if cv_text else _empty_list(),
    )
    
    # Filter out generic company search pages
    filtered_results = [r for r in raw_results if _is_valid_job_url(r.get("url", ""))]
    filtered_results = filtered_results[:10]  # Take top 10 valid results

    await log_emitter.emit(state.get("run_id"), {"type": "info", "message": f"Scout: Found {len(filtered_results)} valid individual job postings ({len(raw_results)} total raw)."})
    await log_emitter.emit(state.get("run_id"), {"type": "info", "message": "Scout: Generating embeddings to pre-score semantic match..."})

    # Pre-score all results (batch embed content fields)
    contents = [r.get("content", "") for r in filtered_results]
    if cv_embedding and any(contents):
        try:
            from app.tools.embedding_tools import embed_texts
            offer_embeddings = await embed_texts([c[:1000] for c in contents])
        except Exception as exc:
            logger.warning("Scout: batch embedding failed: %s", exc)
            offer_embeddings = [[] for _ in contents]
    else:
        offer_embeddings = [[] for _ in contents]

    offers: list[dict] = []
    for result, content, offer_emb in zip(filtered_results, contents, offer_embeddings):
        if cv_embedding and offer_emb:
            score = _cosine_similarity_pct(cv_embedding, offer_emb)
        else:
            # Fall back to Tavily's own score (0–1 range)
            score = float(result.get("score", 0.5)) * 100

        offers.append({
            "id": str(uuid.uuid4()),
            "title": result.get("title", "Unknown"),
            "company": _extract_company(result.get("url", "")),
            "url": result.get("url", ""),
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


def _extract_company(url: str) -> str:
    """Best-effort company name extraction from URL domain."""
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc.replace("www.", "")
        return domain.split(".")[0].capitalize() if domain else "Unknown"
    except Exception:
        return "Unknown"
