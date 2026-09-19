"""Display-layer title/company cleaners — strip aggregator chrome."""

from __future__ import annotations

import re
from urllib.parse import unquote, urlparse

ATS_BRANDS = {
    "greenhouse",
    "lever",
    "ashby",
    "ashbyhq",
    "workable",
    "teamtailor",
    "linkedin",
    "indeed",
    "glassdoor",
    "smartrecruiters",
    "workday",
    "jobvite",
    "icims",
    "monster",
    "ziprecruiter",
    "jooble",
    "wellfound",
    "angellist",
}

HOST_TLDS = {
    "com",
    "io",
    "co",
    "org",
    "net",
    "dev",
    "app",
    "ai",
    "fr",
    "be",
    "nl",
    "de",
    "uk",
    "eu",
    "info",
    "jobs",
    "careers",
}

_CHROME_SEGMENT = re.compile(
    r"^(jobs?|careers?|hiring|opportunities|vacancies|vacatures|emplois?|"
    r"offres?(?:\s+d['’]emploi)?|application|apply|job application|"
    r"linkedin(?:\s+jobs?)?|indeed|glassdoor|greenhouse|lever|ashby|workable|"
    r"teamtailor|smartrecruiters|workday|monster|welcome to .+|jobs?\s+at\s+.+|"
    r"careers?\s+at\s+.+|application\s+[-–—]\s*.+)$",
    re.IGNORECASE,
)

_CHROME_PREFIXES = [
    re.compile(r"^apply(?:\s+now)?(?:\s+for)?\s+", re.IGNORECASE),
    re.compile(r"^job application for\s+", re.IGNORECASE),
    re.compile(r"^application for\s+", re.IGNORECASE),
    re.compile(r"^we(?:['’]re| are) hiring[:\s]+", re.IGNORECASE),
    re.compile(r"^now hiring[:\s]+", re.IGNORECASE),
    re.compile(r"^hiring[:\s]+", re.IGNORECASE),
]

_TRAILING_CHROME = re.compile(
    r"\s+(?:application|apply|jobs?|careers?|linkedin|greenhouse|lever|ashby|workable|teamtailor)\s*$",
    re.IGNORECASE,
)

_PIPE_SPLIT = re.compile(r"\s*[|｜]\s*")
_DASH_SPLIT = re.compile(r"\s+[-–—]\s+")
_ID_RE = re.compile(r"^[0-9a-f-]{8,}$", re.IGNORECASE)


def _collapse_ws(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _is_mostly_id(value: str) -> bool:
    return bool(_ID_RE.match(value)) and any(ch.isdigit() for ch in value)


def _is_ats_brand(value: str) -> bool:
    token = _collapse_ws(value).lower()
    if not token:
        return True
    if token in ATS_BRANDS:
        return True
    first = re.split(r"[\s./]+", token)[0]
    return first in ATS_BRANDS


def looks_like_url_host(value: str) -> bool:
    raw = _collapse_ws(value).lower()
    raw = re.sub(r"^https?://", "", raw)
    raw = re.sub(r"/.*$", "", raw)
    if not raw or " " in raw:
        return False
    if not re.match(r"^[a-z0-9-]+(\.[a-z0-9-]+)+$", raw):
        return False
    tld = raw.split(".")[-1]
    return tld in HOST_TLDS or raw.split(".")[0] in ATS_BRANDS


def _is_chrome_segment(segment: str, company_name: str | None = None) -> bool:
    value = _collapse_ws(segment)
    if not value:
        return True
    if _CHROME_SEGMENT.match(value):
        return True
    if _is_ats_brand(value) or looks_like_url_host(value):
        return True
    if company_name and value.lower() == _collapse_ws(company_name).lower():
        return True
    return False


def _humanize_slug(slug: str) -> str:
    return slug.replace("-", " ").replace("_", " ").title().strip()


def company_from_apply_url(apply_url: str | None) -> str | None:
    if not apply_url:
        return None
    try:
        parsed = urlparse(apply_url)
    except Exception:
        return None
    host = (parsed.netloc or "").lower().replace("www.", "")
    parts = [p for p in parsed.path.split("/") if p]
    ats_host = any(
        token in host for token in ("greenhouse.io", "lever.co", "ashbyhq.com", "workable.com")
    )
    if ats_host and parts and not _is_mostly_id(parts[0]):
        return _humanize_slug(unquote(parts[0]))

    skip = {
        "www",
        "careers",
        "jobs",
        "apply",
        "hire",
        "recruiting",
        "talent",
        "work",
        "boards",
        "job-boards",
        "app",
        "go",
    }
    for label in host.split("."):
        if label in skip or label in HOST_TLDS or label in ATS_BRANDS:
            continue
        if len(label) < 2:
            continue
        return _humanize_slug(label)
    return None


def clean_job_title(raw: str, company_name: str | None = None) -> str:
    """Role-only title: strip `| Company`, ` - Jobs`, Workable/LinkedIn chrome."""
    title = _collapse_ws(raw)
    if not title:
        return ""

    pipe_parts = [p for p in _PIPE_SPLIT.split(title) if p.strip()]
    if len(pipe_parts) > 1:
        title = next(
            (part for part in pipe_parts if not _is_chrome_segment(part, company_name)),
            pipe_parts[0],
        )

    changed = True
    while changed:
        changed = False
        dash_parts = [p for p in _DASH_SPLIT.split(title) if p.strip()]
        if len(dash_parts) < 2:
            break
        if _is_chrome_segment(dash_parts[-1], company_name):
            title = " - ".join(dash_parts[:-1])
            changed = True

    for prefix in _CHROME_PREFIXES:
        title = prefix.sub("", title).strip()

    title = _TRAILING_CHROME.sub("", title).strip()

    if company_name:
        company = re.escape(_collapse_ws(company_name))
        title = re.sub(rf"\s+(?:at|chez|bij|@)\s+{company}\s*$", "", title, flags=re.IGNORECASE).strip()

    title = re.sub(r"[\s|–—:-]+$", "", title).strip()
    if _is_chrome_segment(title, company_name):
        return ""
    return title


def display_company(
    company_name: str | None,
    *,
    company_slug: str | None = None,
    apply_url: str | None = None,
) -> str:
    """Canonical company name — never a URL host or ATS brand."""
    raw = _collapse_ws(company_name or "")
    if raw and not looks_like_url_host(raw) and not _is_ats_brand(raw):
        return raw

    slug = _collapse_ws(company_slug or "")
    if (
        slug
        and not looks_like_url_host(slug)
        and "." not in slug
        and not _is_ats_brand(slug)
        and not _is_mostly_id(slug)
    ):
        return _humanize_slug(slug)

    from_url = company_from_apply_url(apply_url)
    if from_url and not _is_ats_brand(from_url) and not looks_like_url_host(from_url):
        return from_url

    if slug and not _is_ats_brand(slug):
        return _humanize_slug(slug.replace(".", " "))
    return ""
