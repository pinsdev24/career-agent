"""Scout node — searches for job offers using Tavily (explore mode)."""

import asyncio
import logging
import uuid

from langchain_core.runnables import RunnableConfig

from app.models.state import AgentState
from app.tools.embedding_tools import embed_text
from app.tools.tavily_tools import search_jobs

logger = logging.getLogger(__name__)

SCOUT_QUERY_TEMPLATE = "{job_title} {skills} {location} {contract_type} job offer"


async def scout_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """Search for relevant job offers based on CV and user preferences.

    Query is built from CV structured data + user search preferences.
    Results are pre-scored using embedding cosine similarity against the full CV.
    """
    logger.info("Scout: searching offers for run=%s", state.get("run_id"))

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

    # Fetch results and CV embedding concurrently
    cv_text = state.get("cv_text", "")
    raw_results, cv_embedding = await asyncio.gather(
        search_jobs(query, max_results=10),
        embed_text(cv_text[:2000]) if cv_text else asyncio.coroutine(lambda: [])(),
    )

    # Pre-score all results (batch embed content fields)
    contents = [r.get("content", "") for r in raw_results]
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
    for result, content, offer_emb in zip(raw_results, contents, offer_embeddings):
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
            "pre_score": round(score, 1),
            "location": location or None,
        })

    offers.sort(key=lambda x: x["pre_score"], reverse=True)
    logger.info("Scout: found %d offers for run=%s", len(offers), state.get("run_id"))

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
