"""URL quality gates — aggregator denylist and ATS posting predicates."""

import re
from urllib.parse import parse_qs, unquote, urlparse

# Domains / patterns that are almost never direct apply pages.
AGGREGATOR_DENYLIST = (
    "indeed.com",
    "indeed.fr",
    "linkedin.com/jobs/search",
    "glassdoor.com/job-search",
    "glassdoor.com/Job/jobs",
    "jooble.org",
    "talent.com",
    "ziprecruiter.com",
    "simplyhired.com",
    "monster.com",
    "careerbuilder.com",
    "reed.co.uk",
    "adzuna.",
    "neuvoo.",
    "jobrapido.",
    "google.com/search",
    "bing.com/search",
)

ATS_ALLOWLIST_HOSTS = (
    "boards.greenhouse.io",
    "job-boards.greenhouse.io",
    "boards-api.greenhouse.io",
    "jobs.lever.co",
    "api.lever.co",
    "jobs.ashbyhq.com",
    "api.ashbyhq.com",
    "apply.workable.com",
    "jobs.workable.com",
)

_INVALID_PATH_PATTERNS = [
    r"/search",
    r"jobs\?q=",
    r"jobs\?l=",
    r"job-search",
    r"/jobs/list",
    r"/results",
    r"/category/",
    r"/categories/",
    r"linkedin\.com/jobs/search",
    r"linkedin\.com/in/",
    r"linkedin\.com/company/",
    r"glassdoor\.com/overview/",
    r"glassdoor\.com/reviews/",
    r"glassdoor\.com/salary/",
]


def is_aggregator_url(url: str) -> bool:
    """True if URL points at a known aggregator / SERP."""
    lower = url.lower()
    return any(block in lower for block in AGGREGATOR_DENYLIST)


def is_ats_host(url: str) -> bool:
    """True if host is a known ATS board host."""
    host = urlparse(url).netloc.lower()
    return any(host == allowed or host.endswith("." + allowed) for allowed in ATS_ALLOWLIST_HOSTS) or any(
        allowed in host for allowed in ATS_ALLOWLIST_HOSTS
    )


def is_valid_job_url(url: str) -> bool:
    """Filter search pages, aggregators, and non-posting ATS roots."""
    if not url or not url.startswith("http"):
        return False
    if is_aggregator_url(url):
        return False

    url_lower = url.lower()
    for pattern in _INVALID_PATH_PATTERNS:
        if re.search(pattern, url_lower):
            return False

    if "linkedin.com" in url_lower and "/jobs/view/" not in url_lower:
        return False
    if "glassdoor.com" in url_lower and "/job-listing/" not in url_lower and "joblisting" not in url_lower:
        return False
    if "greenhouse.io" in url_lower and "/jobs/" not in url_lower:
        return False
    if "lever.co" in url_lower:
        parts = [p for p in urlparse(url_lower).path.split("/") if p]
        if len(parts) < 2:
            return False
    if "ashbyhq.com" in url_lower:
        parts = [p for p in urlparse(url_lower).path.split("/") if p]
        if len(parts) < 2:
            return False
    if "workable.com" in url_lower and "/j/" not in url_lower and "/jobs/" not in url_lower:
        # company root only
        parts = [p for p in urlparse(url_lower).path.split("/") if p]
        if len(parts) < 2:
            return False

    return True


_RESERVED_BOARD_SLUGS = frozenset({"embed", "embed2", "jobs", "api", "www", "app", "j"})
SEEDABLE_ATS_PROVIDERS = frozenset({"greenhouse", "lever", "ashby", "workable"})
# Ashby orgs like mistral.ai use a dotted board slug — dots are valid, not hosts.
_BOARD_SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$", re.IGNORECASE)


def ats_careers_url(provider: str, slug: str) -> str:
    """Canonical public board URL for a seeded ATS company."""
    mapping = {
        "greenhouse": f"https://boards.greenhouse.io/{slug}",
        "lever": f"https://jobs.lever.co/{slug}",
        "ashby": f"https://jobs.ashbyhq.com/{slug}",
        "workable": f"https://apply.workable.com/{slug}",
    }
    return mapping.get(provider, "")


def normalize_board_slug(slug: str | None) -> str:
    """Lowercase, unquote, and strip a board token (keeps dots)."""
    return unquote((slug or "").strip()).lower()


def _is_board_slug(slug: str) -> bool:
    token = normalize_board_slug(slug)
    return (
        len(token) >= 2
        and token not in _RESERVED_BOARD_SLUGS
        and bool(_BOARD_SLUG_RE.fullmatch(token))
    )


def _job_id_from_parts(provider: str, parts: list[str]) -> str | None:
    """Posting id after the board slug, when the URL is a job (not a board root)."""
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
    token = rest[0]
    if token.lower() in _RESERVED_BOARD_SLUGS:
        return None
    return token


def extract_ats_job_ref(url: str) -> tuple[str, str, str | None] | None:
    """Return (provider, board_slug, job_id|None) for seedable ATS URLs.

    ``job_id`` is set for posting URLs (including Ashby dotted slugs) and is
    None for board roots / Greenhouse ``?for=`` embeds.
    """
    parsed = extract_ats_board_slug(url)
    if not parsed:
        return None
    provider, slug = parsed
    text = url.strip()
    if "://" not in text:
        text = "https://" + text
    parts = [p for p in urlparse(text).path.split("/") if p]
    if parts and normalize_board_slug(parts[0]) == slug:
        return (provider, slug, _job_id_from_parts(provider, parts))
    return (provider, slug, None)


def extract_ats_board_slug(url: str) -> tuple[str, str] | None:
    """Return (provider, board_slug) when URL encodes an ATS company board.

    Accepts job posting URLs and board roots for Greenhouse, Lever, Ashby, and
    Workable. Greenhouse embed boards use ``?for=``. Dotted Ashby slugs such as
    ``mistral.ai`` are valid. Personio, Indeed, LinkedIn, and other hosts
    return None (no fake company).
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
        if for_token and _is_board_slug(for_token):
            return (provider, normalize_board_slug(for_token))
    elif "lever.co" in host:
        provider = "lever"
    elif "ashbyhq.com" in host:
        provider = "ashby"
    elif "workable.com" in host:
        provider = "workable"
    else:
        return None

    if not parts:
        return None
    slug = normalize_board_slug(parts[0])
    if not _is_board_slug(slug):
        return None
    return (provider, slug)
