"""Ashby public job board API connector."""

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


class AshbyConnector:
    """Ashby public job board posting list."""

    provider = "ashby"

    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def fetch_jobs(
        self,
        board_token: str,
        *,
        etag: str | None = None,
    ) -> tuple[list[CanonicalJob], str | None, bool]:
        # Public board API used by jobs.ashbyhq.com embeds
        url = f"https://api.ashbyhq.com/posting-api/job-board/{board_token}"
        headers = {"If-None-Match": etag} if etag else None
        body, resp_headers, status = await get_json(
            self.client,
            url,
            headers=headers,
            params={"includeCompensation": "true"},
        )
        if status == 304:
            return [], etag, True

        jobs_raw = body.get("jobs", []) if isinstance(body, dict) else []
        company_name = board_token.replace("-", " ").title()
        results: list[CanonicalJob] = []
        for job in jobs_raw:
            job_id = str(job.get("id") or "")
            if not job_id:
                continue
            description = _strip_html(
                job.get("descriptionPlain")
                or job.get("descriptionHtml")
                or job.get("description")
                or ""
            )
            location = job.get("location")
            if isinstance(location, dict):
                location = location.get("name") or location.get("address")
            apply_url = job.get("jobUrl") or job.get("applyUrl") or (
                f"https://jobs.ashbyhq.com/{board_token}/{job_id}"
            )
            posted_at = None
            if job.get("publishedAt"):
                try:
                    posted_at = datetime.fromisoformat(
                        str(job["publishedAt"]).replace("Z", "+00:00")
                    )
                except ValueError:
                    posted_at = datetime.now(timezone.utc)

            remote = job.get("isRemote")
            if remote is None and isinstance(job.get("workplaceType"), str):
                remote = job["workplaceType"].lower() == "remote"

            salary = None
            comp = job.get("compensation") or job.get("compensationTier")
            if isinstance(comp, dict):
                salary = str(comp)
            elif isinstance(comp, list) and comp:
                salary = str(comp[0])

            results.append(
                build_canonical_job(
                    source=AtsProvider.ASHBY,
                    external_id=job_id,
                    company_slug=board_token.lower(),
                    company_name=company_name,
                    title=job.get("title") or "Untitled",
                    description_text=description,
                    apply_url=apply_url,
                    location=location if isinstance(location, str) else None,
                    remote=bool(remote) if remote is not None else None,
                    salary=salary,
                    posted_at=posted_at,
                    raw=job,
                )
            )

        return results, resp_headers.get("etag"), False
