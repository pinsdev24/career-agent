"""URL quality gates — aggregator denylist and ATS posting predicates."""

import re
from urllib.parse import urlparse

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


def extract_ats_board_slug(url: str) -> tuple[str, str] | None:
    """Return (provider, board_slug) when URL encodes an ATS company board."""
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    parts = [p for p in parsed.path.split("/") if p]
    if not parts:
        return None

    if "greenhouse.io" in host:
        return ("greenhouse", parts[0].lower())
    if "lever.co" in host:
        return ("lever", parts[0].lower())
    if "ashbyhq.com" in host:
        return ("ashby", parts[0].lower())
    if "workable.com" in host:
        return ("workable", parts[0].lower())
    return None
