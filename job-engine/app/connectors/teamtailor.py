"""Teamtailor public career-site JSON feed connector.

Fetch
-----
``GET https://{board_token}.teamtailor.com/jobs.json``

The payload is a JSON Feed 1.1 document: ``items[]`` plus a nested schema.org
``JobPosting`` on ``_jobposting``. That is the supported, stable contract —
not the authenticated Teamtailor REST API.

Custom-domain edge
------------------
Many customers CNAME ``careers.example.com`` (or similar) at Teamtailor.
Those hosts often **also** serve ``/jobs.json``, but the URL does not encode
the board token. Resolving a custom domain to ``{slug}.teamtailor.com`` would
mean DNS/CNAME inspection or an HTML crawl for Teamtailor asset hosts.

We **do not** do that here. URL seed and discovery only accept
``*.teamtailor.com`` / ``{slug}.teamtailor.com``. Paste
``https://acme.teamtailor.com/jobs/123-role`` (board root is fine too).
Custom career domains stay out of the catalog until a later, explicit
resolver ships — half-implementing an HTML crawler would be fragile and
would hammer hosts we do not allowlist.

404 on ``jobs.json`` deactivates the company like Greenhouse/Lever/Ashby/
Workable. An empty ``items`` list counts as an empty board.
"""

import re
from datetime import datetime, timezone

import httpx

from app.connectors.http import get_json
from app.connectors.text import strip_html
from app.models.schemas import AtsProvider, CanonicalJob
from app.normalize.posting import build_canonical_job

_JOBS_ID_RE = re.compile(r"/jobs/(\d+)", re.IGNORECASE)
_REMOTE_HINTS = (
    "fully remote",
    "remote-first",
    "work from home",
    "working from home",
    "télétravail",
    "teletravail",
    "remote work",
)


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None


def _as_list(value: object) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return [value]
    return []


def _location_from_jobposting(jobposting: dict) -> str | None:
    for place in _as_list(jobposting.get("jobLocation")):
        if not isinstance(place, dict):
            continue
        addr = place.get("address")
        if not isinstance(addr, dict):
            continue
        city = str(addr.get("addressLocality") or "").strip()
        country = str(addr.get("addressCountry") or "").strip()
        if city and country and city.lower() == country.lower():
            return country
        if city and country:
            return f"{city}, {country}"
        if city or country:
            return city or country
    return None


def _identifier_value(jobposting: dict) -> str | None:
    ident = jobposting.get("identifier")
    if isinstance(ident, dict) and ident.get("value") is not None:
        value = str(ident["value"]).strip()
        return value or None
    if isinstance(ident, (str, int)) and str(ident).strip():
        return str(ident).strip()
    return None


def _external_id(item: dict, jobposting: dict) -> str:
    ident = _identifier_value(jobposting)
    if ident:
        return ident
    url = str(item.get("url") or "")
    match = _JOBS_ID_RE.search(url)
    if match:
        return match.group(1)
    return str(item.get("id") or "").strip()


def _company_name(jobposting: dict, *, feed_title: str | None, board_token: str) -> str:
    org = jobposting.get("hiringOrganization")
    if isinstance(org, dict):
        name = str(org.get("name") or "").strip()
        if name:
            return name
    if feed_title and str(feed_title).strip():
        return str(feed_title).strip()
    return board_token.replace("-", " ").replace("_", " ").title()


def _infer_remote(
    *,
    title: str,
    location: str | None,
    description: str,
    jobposting: dict,
) -> bool | None:
    loc_type = str(jobposting.get("jobLocationType") or "").upper()
    if loc_type == "TELECOMMUTE":
        return True
    blob = f"{title} {location or ''} {description}".lower()
    if any(hint in blob for hint in _REMOTE_HINTS):
        return True
    if re.search(r"\bremote\b", blob):
        return True
    if location and "hybrid" in location.lower():
        return False
    return None


def normalize_teamtailor_item(
    item: dict,
    *,
    board_token: str,
    feed_title: str | None = None,
) -> CanonicalJob | None:
    """Map one JSON Feed item + nested JobPosting to a CanonicalJob.

    Returns None when the row has no stable external id (skip, don't crash).
    """
    if not isinstance(item, dict):
        return None
    jobposting = item.get("_jobposting")
    if not isinstance(jobposting, dict):
        jobposting = {}

    external_id = _external_id(item, jobposting)
    if not external_id:
        return None

    title = str(jobposting.get("title") or item.get("title") or "").strip() or "Untitled"
    description = strip_html(
        str(jobposting.get("description") or item.get("content_html") or "")
    )
    apply_url = str(item.get("url") or "").strip()
    if not apply_url:
        apply_url = f"https://{board_token}.teamtailor.com/jobs/{external_id}"

    location = _location_from_jobposting(jobposting)
    company_name = _company_name(jobposting, feed_title=feed_title, board_token=board_token)
    posted_at = _parse_datetime(item.get("date_published")) or _parse_datetime(
        jobposting.get("datePosted")
    )
    if posted_at is None:
        posted_at = datetime.now(timezone.utc)

    employment = jobposting.get("employmentType")
    contract_type = str(employment).strip() if employment else None

    return build_canonical_job(
        source=AtsProvider.TEAMTAILOR,
        external_id=external_id,
        company_slug=board_token.lower(),
        company_name=company_name,
        title=title,
        description_text=description or title,
        apply_url=apply_url,
        location=location,
        remote=_infer_remote(
            title=title,
            location=location,
            description=description,
            jobposting=jobposting,
        ),
        contract_type=contract_type,
        posted_at=posted_at,
        raw=item,
    )


class TeamtailorConnector:
    """Public Teamtailor career-site ``jobs.json`` feed."""

    provider = "teamtailor"

    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def fetch_jobs(
        self,
        board_token: str,
        *,
        etag: str | None = None,
    ) -> tuple[list[CanonicalJob], str | None, bool]:
        slug = (board_token or "").strip()
        url = f"https://{slug}.teamtailor.com/jobs.json"
        headers = {"If-None-Match": etag} if etag else None
        body, resp_headers, status = await get_json(self.client, url, headers=headers)
        if status == 304:
            return [], etag, True

        feed = body if isinstance(body, dict) else {}
        items = feed.get("items") or []
        if not isinstance(items, list):
            items = []
        feed_title = str(feed.get("title") or "").strip() or None
        results: list[CanonicalJob] = []
        for item in items:
            job = normalize_teamtailor_item(
                item if isinstance(item, dict) else {},
                board_token=slug,
                feed_title=feed_title,
            )
            if job:
                results.append(job)
        return results, resp_headers.get("etag"), False
