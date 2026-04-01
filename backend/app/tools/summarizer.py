"""Context-efficient summarization utilities for cost reduction.

Instead of passing full CV text (4000+ chars) and full offer descriptions
(6000+ chars) into every LLM prompt, we generate concise summaries once
in the Matcher node and reuse them in the Writer and Critic nodes.

Uses the fast_model tier (cheapest available) since summarization is a
simple extraction task.
"""

import logging

from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)


async def summarize_cv(cv_text: str, max_words: int = 200) -> str:
    """Generate a concise CV summary preserving key skills, experience, and achievements.

    Args:
        cv_text: The full raw CV text.
        max_words: Target maximum words for the summary.

    Returns:
        A condensed CV summary suitable for LLM prompts.
    """
    if not cv_text or len(cv_text.strip()) < 100:
        return cv_text  # Too short to bother summarizing

    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.fast_model,
        api_key=settings.openai_api_key,
        temperature=0,
    )

    prompt = f"""Summarize this CV in ~{max_words} words. Preserve:
- Full name, current title, years of experience
- Top 5-8 technical skills and tools
- Key achievements with numbers/metrics
- Most relevant past roles (company + title only)
- Education highlights

CV:
{cv_text[:6000]}

Return ONLY the summary, no commentary."""

    try:
        response = await llm.ainvoke([SystemMessage(content=prompt)])
        summary = response.content if isinstance(response.content, str) else ""
        logger.info("Summarized CV: %d chars → %d chars", len(cv_text), len(summary))
        return summary.strip()
    except Exception as exc:
        logger.warning("CV summarization failed (%s), using truncated original", exc)
        return cv_text[:2000]


async def summarize_offer(offer: dict, max_words: int = 150) -> str:
    """Summarize a job offer into key requirements, company, and role details.

    Args:
        offer: The selected_offer dict from state (may have raw_text, snippet, structured).
        max_words: Target maximum words for the summary.

    Returns:
        A condensed offer summary suitable for LLM prompts.
    """
    # Build the best possible offer text from available fields
    parts = []
    if offer.get("title"):
        parts.append(f"Title: {offer['title']}")
    if offer.get("company"):
        parts.append(f"Company: {offer['company']}")
    if offer.get("structured", {}).get("description"):
        parts.append(offer["structured"]["description"])
    elif offer.get("raw_text"):
        parts.append(offer["raw_text"])
    elif offer.get("snippet"):
        parts.append(offer["snippet"])

    offer_text = "\n".join(parts)
    if not offer_text or len(offer_text.strip()) < 80:
        return offer_text

    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.fast_model,
        api_key=settings.openai_api_key,
        temperature=0,
    )

    prompt = f"""Summarize this job offer in ~{max_words} words. Preserve:
- Job title, company name, location/remote status
- Top 5 required skills/qualifications
- Key responsibilities (3-4 bullet points)
- Seniority level and team context
- Any standout perks or requirements

JOB OFFER:
{offer_text[:4000]}

Return ONLY the summary, no commentary."""

    try:
        response = await llm.ainvoke([SystemMessage(content=prompt)])
        summary = response.content if isinstance(response.content, str) else ""
        logger.info("Summarized offer: %d chars → %d chars", len(offer_text), len(summary))
        return summary.strip()
    except Exception as exc:
        logger.warning("Offer summarization failed (%s), using truncated original", exc)
        return offer_text[:1500]


async def summarize_gap_report(gap_report: dict) -> str:
    """One-paragraph gap summary for compact prompts.

    Unlike the full gap_report dict (which has lists of matching/missing skills),
    this returns a 2-3 sentence narrative for the writer to use.
    """
    if not gap_report:
        return "No gap analysis available."

    matching = ", ".join(gap_report.get("matching_skills", []))
    missing = ", ".join(gap_report.get("missing_skills", []))
    score = gap_report.get("match_score", "N/A")
    summary = gap_report.get("summary", "")

    # If the gap report already has a summary, just enrich it slightly
    parts = [f"Match score: {score}/100."]
    if summary:
        parts.append(summary)
    if matching:
        parts.append(f"Matching skills: {matching}.")
    if missing:
        parts.append(f"Gaps to address: {missing}.")

    return " ".join(parts)
