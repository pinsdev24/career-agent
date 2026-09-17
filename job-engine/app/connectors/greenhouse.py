"""Greenhouse boards API connector."""

from datetime import datetime, timezone
from html import unescape
import re

import httpx

from app.connectors.http import get_json
from app.models.schemas import AtsProvider, CanonicalJob
from app.normalize.posting import build_canonical_job


def _strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    return unescape(re.sub(r"\s+", " ", text)).strip()


class GreenhouseConnector:
    """Public Greenhouse Board API."""

    provider = "greenhouse"

    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def fetch_jobs(
        self,
        board_token: str,
        *,
        etag: str | None = None,
    ) -> tuple[list[CanonicalJob], str | None, bool]:
        url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs"
        headers = {"If-None-Match": etag} if etag else None
        try:
            body, resp_headers, status = await get_json(
                self.client,
                url,
                headers=headers,
                params={"content": "true"},
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 304:
                return [], etag, True
            raise

        if status == 304:
            return [], etag, True

        jobs_raw = body.get("jobs", []) if isinstance(body, dict) else []
        company_name = board_token.replace("-", " ").title()
        results: list[CanonicalJob] = []
        for job in jobs_raw:
            job_id = str(job.get("id", ""))
            if not job_id:
                continue
            location = None
            if isinstance(job.get("location"), dict):
                location = job["location"].get("name")
            offices = job.get("offices") or []
            if not location and offices:
                location = offices[0].get("name")
            content = _strip_html(job.get("content") or "")
            absolute_url = job.get("absolute_url") or (
                f"https://boards.greenhouse.io/{board_token}/jobs/{job_id}"
            )
            posted_at = None
            if job.get("updated_at"):
                try:
                    posted_at = datetime.fromisoformat(
                        job["updated_at"].replace("Z", "+00:00")
                    )
                except ValueError:
                    posted_at = datetime.now(timezone.utc)

            results.append(
                build_canonical_job(
                    source=AtsProvider.GREENHOUSE,
                    external_id=job_id,
                    company_slug=board_token.lower(),
                    company_name=company_name,
                    title=job.get("title") or "Untitled",
                    description_text=content,
                    apply_url=absolute_url,
                    location=location,
                    remote=_infer_remote(location, content),
                    posted_at=posted_at,
                    raw=job,
                )
            )

        new_etag = resp_headers.get("etag")
        return results, new_etag, False


def _infer_remote(location: str | None, content: str) -> bool | None:
    blob = f"{location or ''} {content}".lower()
    if "remote" in blob or "work from home" in blob or "télétravail" in blob:
        return True
    if location and any(x in location.lower() for x in ("hybrid",)):
        return False
    return None
