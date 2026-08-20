"""Workable public widget jobs API connector."""

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


class WorkableConnector:
    """Workable public jobs widget endpoint."""

    provider = "workable"

    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def fetch_jobs(
        self,
        board_token: str,
        *,
        etag: str | None = None,
    ) -> tuple[list[CanonicalJob], str | None, bool]:
        url = f"https://apply.workable.com/api/v1/widget/accounts/{board_token}"
        headers = {"If-None-Match": etag} if etag else None
        body, resp_headers, status = await get_json(self.client, url, headers=headers)
        if status == 304:
            return [], etag, True

        jobs_raw = body.get("jobs", []) if isinstance(body, dict) else []
        company_name = (
            (body.get("name") if isinstance(body, dict) else None)
            or board_token.replace("-", " ").title()
        )
        results: list[CanonicalJob] = []
        for job in jobs_raw:
            job_id = str(job.get("id") or job.get("shortcode") or "")
            if not job_id:
                continue
            description = _strip_html(
                job.get("description") or job.get("full_description") or ""
            )
            # Widget list often has short descriptions; detail URL still useful
            location = job.get("location") or job.get("city")
            if isinstance(location, dict):
                location = location.get("city") or location.get("location_str")
            apply_url = job.get("url") or (
                f"https://apply.workable.com/{board_token}/j/{job_id}/"
            )
            posted_at = None
            if job.get("published_on"):
                try:
                    posted_at = datetime.fromisoformat(
                        str(job["published_on"]).replace("Z", "+00:00")
                    )
                except ValueError:
                    posted_at = datetime.now(timezone.utc)

            remote = None
            workplace = (job.get("workplace") or job.get("telecommuting") or "")
            if isinstance(workplace, bool):
                remote = workplace
            elif isinstance(workplace, str) and workplace.lower() in ("remote", "hybrid"):
                remote = workplace.lower() == "remote"

            results.append(
                build_canonical_job(
                    source=AtsProvider.WORKABLE,
                    external_id=job_id,
                    company_slug=board_token.lower(),
                    company_name=company_name,
                    title=job.get("title") or "Untitled",
                    description_text=description or (job.get("title") or ""),
                    apply_url=apply_url,
                    location=location if isinstance(location, str) else None,
                    remote=remote,
                    contract_type=job.get("employment_type"),
                    posted_at=posted_at,
                    raw=job,
                )
            )

        return results, resp_headers.get("etag"), False
