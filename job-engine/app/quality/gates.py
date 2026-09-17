"""Content quality gates — closed jobs and minimum content."""

import re

from app.config import get_settings

CLOSED_JOB_PATTERNS = re.compile(
    r"(no\s+longer\s+(available|open|accepting)|"
    r"position\s+(has\s+been\s+)?(filled|closed|removed)|"
    r"(listing|posting)\s+(has\s+)?(expired|been\s+removed)|"
    r"opportunity\s+(is\s+)?(closed|no\s+longer)|"
    r"application\s+(period|window)\s+(has\s+)?(closed|ended|expired)|"
    r"404\s*[-–—]\s*(page|not\s+found)|"
    r"job\s+not\s+found|"
    r"couldn't\s+find\s+anything\s+here|"
    r"(posting|job)\s+you'?r?e?\s+looking\s+for\s+(might\s+have\s+)?(closed|been\s+removed)|"
    r"sorry,?\s+we\s+couldn't\s+find|"
    r"(the\s+)?job\s+(you\s+(requested|are\s+looking\s+for)\s+)?(was\s+)?not\s+found|"
    r"it\s+has\s+been\s+(removed|closed|taken\s+down))",
    re.IGNORECASE,
)


def is_closed_job_text(text: str) -> bool:
    """True if page/snippet indicates the job is no longer open."""
    if not text:
        return False
    return bool(CLOSED_JOB_PATTERNS.search(text))


def has_sufficient_content(text: str, min_chars: int | None = None) -> bool:
    """True if description is long enough to be a real posting."""
    threshold = min_chars if min_chars is not None else get_settings().min_extract_chars
    return len((text or "").strip()) >= threshold


def passes_content_gates(text: str, min_chars: int | None = None) -> bool:
    """Combined content quality check."""
    if not has_sufficient_content(text, min_chars=min_chars):
        return False
    if is_closed_job_text(text):
        return False
    return True
