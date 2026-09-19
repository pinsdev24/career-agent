"""Fetch a job description from public ATS JSON APIs — no Tavily.

Used by the URL-mode scraper and packet path so Ashby/Greenhouse/Lever/Workable
boards (including dotted slugs like ``mistral.ai``) never depend on Tavily
extract, which those hosts often block.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from html import unescape
from urllib.parse import parse_qs, quote, unquote, urlparse

import httpx

logger = logging.getLogger(__name__)

_RESERVED_BOARD_SLUGS = frozenset({"embed", "embed2", "jobs", "api", "www", "app", "j"})
_BOARD_SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$", re.IGNORECASE)
_HTML_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")

SEEDABLE_ATS_PROVIDERS = frozenset(
    {"greenhouse", "lever", "ashby", "workable", "teamtailor"}
)
_TEAMTAILOR_RESERVED = frozenset(
    {
        "www",
        "app",
        "api",
        "jobs",
        "career",
        "careers",
        "support",
        "help",
        "blog",
        "mail",
        "email",
        "status",
        "assets",
        "cdn",
        "login",
        "admin",
        "signup",
        "go",
        "embed",
    }
)
_JOBS_ID_RE = re.compile(r"/jobs/(\d+)", re.IGNORECASE)


@dataclass(frozen=True)
class AtsJobRef:
    provider: str
    slug: str
    job_id: str | None = None


def normalize_board_slug(slug: str | None) -> str:
    return unquote((slug or "").strip()).lower()


def is_board_slug(slug: str | None) -> bool:
    token = normalize_board_slug(slug)
    return (
        len(token) >= 2
        and token not in _RESERVED_BOARD_SLUGS
        and bool(_BOARD_SLUG_RE.fullmatch(token))
    )


def humanize_board_slug(slug: str) -> str:
    return normalize_board_slug(slug).replace("-", " ").replace("_", " ").replace(".", " ").title()


def _strip_html(html: str) -> str:
    text = _HTML_TAG.sub(" ", html or "")
    return unescape(_WS.sub(" ", text)).strip()


def _job_id_from_parts(provider: str, parts: list[str]) -> str | None:
    if len(parts) < 2:
        return None
    rest = [unquote(p) for p in parts[1:]]
    if provider == "greenhouse":
        if len(rest) >= 2 and rest[0].lower() == "jobs" and rest[1]:
            return rest[1]
        return None
    if provider == "workable":
        if len(rest) >= 2 and rest[0].lower() in {"j", "jobs"} and rest[1]:
            return rest[1]
        return rest[0] if rest[0].lower() not in _RESERVED_BOARD_SLUGS else None
    if provider == "teamtailor":
        for i, part in enumerate(parts):
            if unquote(part).lower() != "jobs":
                continue
            if i + 1 >= len(parts):
                return None
            token = unquote(parts[i + 1]).strip()
            return token or None
        return None
    token = rest[0]
    if token.lower() in _RESERVED_BOARD_SLUGS:
        return None
    return token


def parse_ats_job_url(url: str | None) -> AtsJobRef | None:
    """Parse Greenhouse / Lever / Ashby / Workable / Teamtailor job or board URLs.

    Dotted Ashby org slugs (``mistral.ai``) are accepted. Teamtailor slugs come
    from ``{slug}.teamtailor.com`` (custom career domains are not resolved).
    Returns None for Indeed, LinkedIn, Personio, and other non-seedable hosts.
    """
    if not url or not isinstance(url, str):
        return None
    text = url.strip()
    if not text:
        return None
    if "://" not in text:
        text = "https://" + text

    parsed = urlparse(text)
    host = parsed.netloc.lower().removeprefix("www.")
    parts = [p for p in parsed.path.split("/") if p]
    query = parse_qs(parsed.query)

    provider: str | None = None
    if "greenhouse.io" in host:
        provider = "greenhouse"
        for_token = (query.get("for") or [None])[0]
        if for_token and is_board_slug(for_token):
            return AtsJobRef(provider, normalize_board_slug(for_token), None)
    elif "lever.co" in host:
        provider = "lever"
    elif "ashbyhq.com" in host:
        provider = "ashby"
    elif "workable.com" in host:
        provider = "workable"
    elif "teamtailor.com" in host:
        provider = "teamtailor"
        suffix = "teamtailor.com"
        if host == suffix or not host.endswith("." + suffix):
            return None
        label = host[: -(len(suffix) + 1)]
        if "." in label:
            label = label.rsplit(".", 1)[-1]
        if label in _TEAMTAILOR_RESERVED or not is_board_slug(label):
            return None
        slug = normalize_board_slug(label)
        return AtsJobRef(provider, slug, _job_id_from_parts(provider, parts))
    else:
        return None

    if not parts:
        return None
    slug = normalize_board_slug(parts[0])
    if not is_board_slug(slug):
        return None
    return AtsJobRef(provider, slug, _job_id_from_parts(provider, parts))


def format_job_text(
    *,
    title: str,
    company: str,
    location: str | None,
    description: str,
    apply_url: str,
) -> str:
    bits = [f"{title} at {company}".strip()]
    if location:
        bits.append(f"Location: {location}")
    bits.append(f"Apply: {apply_url}")
    if description:
        bits.append(description)
    return "\n\n".join(b for b in bits if b).strip()


def fallback_ats_text(ref: AtsJobRef, url: str) -> str:
    company = humanize_board_slug(ref.slug)
    title = "Job posting"
    return format_job_text(
        title=title,
        company=company,
        location=None,
        description=(
            f"{company} is hiring. The full description could not be loaded from "
            f"this {ref.provider.title()} page — open the apply URL for details."
        ),
        apply_url=url,
    )


def _quote_token(token: str) -> str:
    return quote(token, safe="._-")


def _match_job_id(job_id: str | None, candidate: str) -> bool:
    if not job_id:
        return False
    return candidate.lower() == job_id.lower()


async def _get_json(url: str, *, params: dict | None = None) -> dict | list:
    timeout = httpx.Timeout(15.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


def _from_greenhouse(body: dict, ref: AtsJobRef, url: str) -> dict | None:
    job_id = str(body.get("id") or "")
    if ref.job_id and job_id and not _match_job_id(ref.job_id, job_id):
        return None
    title = (body.get("title") or "Untitled").strip()
    location = None
    if isinstance(body.get("location"), dict):
        location = body["location"].get("name")
    description = _strip_html(body.get("content") or "")
    apply_url = body.get("absolute_url") or url
    company = humanize_board_slug(ref.slug)
    text = format_job_text(
        title=title,
        company=company,
        location=location if isinstance(location, str) else None,
        description=description,
        apply_url=apply_url,
    )
    if len(text) < 40:
        return None
    return {
        "url": url,
        "raw_content": text,
        "source": "ats",
        "provider": ref.provider,
        "title": title,
        "company": company,
        "location": location,
    }


def _from_ashby_job(job: dict, ref: AtsJobRef, url: str) -> dict:
    title = (job.get("title") or "Untitled").strip()
    location = job.get("location")
    if isinstance(location, dict):
        location = location.get("name") or location.get("address")
    description = _strip_html(
        job.get("descriptionPlain") or job.get("descriptionHtml") or job.get("description") or ""
    )
    apply_url = job.get("jobUrl") or job.get("applyUrl") or url
    company = humanize_board_slug(ref.slug)
    return {
        "url": url,
        "raw_content": format_job_text(
            title=title,
            company=company,
            location=location if isinstance(location, str) else None,
            description=description,
            apply_url=apply_url,
        ),
        "source": "ats",
        "provider": ref.provider,
        "title": title,
        "company": company,
        "location": location if isinstance(location, str) else None,
    }


def _from_lever(body: dict, ref: AtsJobRef, url: str) -> dict | None:
    title = (body.get("text") or body.get("title") or "Untitled").strip()
    lists = body.get("lists") or []
    desc_parts = [_strip_html(body.get("descriptionPlain") or body.get("description") or "")]
    for block in lists:
        if not isinstance(block, dict):
            continue
        desc_parts.append(_strip_html(block.get("text") or ""))
        for item in block.get("content") or []:
            desc_parts.append(_strip_html(item) if isinstance(item, str) else "")
    description = " ".join(p for p in desc_parts if p)
    categories = body.get("categories") or {}
    location = categories.get("location") if isinstance(categories, dict) else None
    apply_url = body.get("hostedUrl") or body.get("applyUrl") or url
    company = humanize_board_slug(ref.slug)
    text = format_job_text(
        title=title,
        company=company,
        location=location if isinstance(location, str) else None,
        description=description,
        apply_url=apply_url,
    )
    if len(text) < 40:
        return None
    return {
        "url": url,
        "raw_content": text,
        "source": "ats",
        "provider": ref.provider,
        "title": title,
        "company": company,
        "location": location if isinstance(location, str) else None,
    }


def _from_workable_job(job: dict, ref: AtsJobRef, url: str, company: str) -> dict:
    title = (job.get("title") or "Untitled").strip()
    location = job.get("location") or job.get("city")
    if isinstance(location, dict):
        location = location.get("city") or location.get("location_str")
    description = _strip_html(job.get("description") or job.get("full_description") or "")
    apply_url = job.get("url") or url
    return {
        "url": url,
        "raw_content": format_job_text(
            title=title,
            company=company,
            location=location if isinstance(location, str) else None,
            description=description or title,
            apply_url=apply_url,
        ),
        "source": "ats",
        "provider": ref.provider,
        "title": title,
        "company": company,
        "location": location if isinstance(location, str) else None,
    }


def _from_teamtailor_item(item: dict, ref: AtsJobRef, url: str, company: str) -> dict:
    jobposting = item.get("_jobposting") if isinstance(item.get("_jobposting"), dict) else {}
    title = str(jobposting.get("title") or item.get("title") or "Untitled").strip()
    location = None
    loc = jobposting.get("jobLocation")
    places = loc if isinstance(loc, list) else [loc] if isinstance(loc, dict) else []
    for place in places:
        if not isinstance(place, dict):
            continue
        addr = place.get("address")
        if not isinstance(addr, dict):
            continue
        city = str(addr.get("addressLocality") or "").strip()
        country = str(addr.get("addressCountry") or "").strip()
        if city and country and city.lower() != country.lower():
            location = f"{city}, {country}"
        else:
            location = city or country or None
        if location:
            break
    description = _strip_html(
        str(jobposting.get("description") or item.get("content_html") or "")
    )
    apply_url = str(item.get("url") or url)
    return {
        "url": url,
        "raw_content": format_job_text(
            title=title,
            company=company,
            location=location,
            description=description or title,
            apply_url=apply_url,
        ),
        "source": "ats",
        "provider": ref.provider,
        "title": title,
        "company": company,
        "location": location,
    }


def _teamtailor_item_ids(item: dict) -> list[str]:
    ids: list[str] = []
    jobposting = item.get("_jobposting") if isinstance(item.get("_jobposting"), dict) else {}
    ident = jobposting.get("identifier")
    if isinstance(ident, dict) and ident.get("value") is not None:
        ids.append(str(ident["value"]))
    elif isinstance(ident, (str, int)):
        ids.append(str(ident))
    if item.get("id"):
        ids.append(str(item["id"]))
    url = str(item.get("url") or "")
    match = _JOBS_ID_RE.search(url)
    if match:
        ids.append(match.group(1))
    return ids


async def fetch_ats_job(url: str) -> dict | None:
    """Load JD text from the public ATS JSON API. None if host is not ATS or fetch fails."""
    ref = parse_ats_job_url(url)
    if not ref or ref.provider not in SEEDABLE_ATS_PROVIDERS:
        return None
    token = _quote_token(ref.slug)
    try:
        if ref.provider == "greenhouse" and ref.job_id:
            body = await _get_json(
                f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs/{_quote_token(ref.job_id)}",
                params={"content": "true"},
            )
            if isinstance(body, dict):
                return _from_greenhouse(body, ref, url)
        elif ref.provider == "greenhouse":
            body = await _get_json(
                f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs",
                params={"content": "true"},
            )
            jobs = body.get("jobs", []) if isinstance(body, dict) else []
            if jobs and isinstance(jobs[0], dict):
                return _from_greenhouse(jobs[0], AtsJobRef(ref.provider, ref.slug, None), url)
        elif ref.provider == "ashby":
            body = await _get_json(
                f"https://api.ashbyhq.com/posting-api/job-board/{token}",
                params={"includeCompensation": "true"},
            )
            jobs = body.get("jobs", []) if isinstance(body, dict) else []
            picked = None
            for job in jobs:
                if not isinstance(job, dict):
                    continue
                jid = str(job.get("id") or "")
                job_url = str(job.get("jobUrl") or job.get("applyUrl") or "")
                if ref.job_id and (
                    _match_job_id(ref.job_id, jid) or ref.job_id.lower() in job_url.lower()
                ):
                    picked = job
                    break
            if picked is None and jobs and not ref.job_id:
                picked = jobs[0] if isinstance(jobs[0], dict) else None
            if picked:
                return _from_ashby_job(picked, ref, url)
        elif ref.provider == "lever" and ref.job_id:
            body = await _get_json(
                f"https://api.lever.co/v0/postings/{token}/{_quote_token(ref.job_id)}"
            )
            if isinstance(body, dict):
                return _from_lever(body, ref, url)
        elif ref.provider == "lever":
            body = await _get_json(
                f"https://api.lever.co/v0/postings/{token}",
                params={"mode": "json"},
            )
            jobs = body if isinstance(body, list) else []
            if jobs and isinstance(jobs[0], dict):
                return _from_lever(jobs[0], ref, url)
        elif ref.provider == "workable":
            body = await _get_json(
                f"https://apply.workable.com/api/v1/widget/accounts/{token}"
            )
            company = (
                (body.get("name") if isinstance(body, dict) else None)
                or humanize_board_slug(ref.slug)
            )
            jobs = body.get("jobs", []) if isinstance(body, dict) else []
            picked = None
            for job in jobs:
                if not isinstance(job, dict):
                    continue
                jid = str(job.get("id") or job.get("shortcode") or "")
                if ref.job_id and (
                    _match_job_id(ref.job_id, jid)
                    or _match_job_id(ref.job_id, str(job.get("shortcode") or ""))
                ):
                    picked = job
                    break
            if picked is None and jobs and not ref.job_id:
                picked = jobs[0] if isinstance(jobs[0], dict) else None
            if picked:
                return _from_workable_job(picked, ref, url, str(company))
        elif ref.provider == "teamtailor":
            body = await _get_json(f"https://{token}.teamtailor.com/jobs.json")
            items = body.get("items", []) if isinstance(body, dict) else []
            company = (
                (body.get("title") if isinstance(body, dict) else None)
                or humanize_board_slug(ref.slug)
            )
            picked = None
            job_token = (ref.job_id or "").lower()
            numeric = job_token.split("-", 1)[0] if job_token else ""
            for item in items:
                if not isinstance(item, dict):
                    continue
                candidates = [c.lower() for c in _teamtailor_item_ids(item)]
                item_url = str(item.get("url") or "").lower()
                if ref.job_id and (
                    job_token in candidates
                    or numeric in candidates
                    or (numeric and numeric in item_url)
                    or job_token in item_url
                ):
                    picked = item
                    break
            if picked is None and items and not ref.job_id:
                picked = items[0] if isinstance(items[0], dict) else None
            if picked:
                return _from_teamtailor_item(picked, ref, url, str(company))
    except Exception as exc:
        logger.warning(
            "ats_extract_failed provider=%s slug=%s job_id=%s error=%s",
            ref.provider,
            ref.slug,
            ref.job_id,
            exc,
        )
        return None
    logger.info(
        "ats_extract_miss provider=%s slug=%s job_id=%s",
        ref.provider,
        ref.slug,
        ref.job_id,
    )
    return None


_MIN_PACKET_JD_CHARS = 80


async def backfill_ats_description(posting: dict) -> dict:
    """If catalog JD is thin, load it from the ATS JSON API (never Tavily)."""
    description = (posting.get("description_text") or "").strip()
    url = posting.get("apply_url") or ""
    if len(description) >= _MIN_PACKET_JD_CHARS or not parse_ats_job_url(url):
        return posting
    fetched = await fetch_ats_job(url)
    text = (fetched or {}).get("raw_content") or ""
    if len(text) < 40:
        return posting
    updated = dict(posting)
    updated["description_text"] = text
    if fetched.get("title") and not (updated.get("title") or "").strip():
        updated["title"] = fetched["title"]
    if fetched.get("company") and not (updated.get("company_name") or "").strip():
        updated["company_name"] = fetched["company"]
    return updated
