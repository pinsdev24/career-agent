"""Lever postings API connector."""

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


class LeverConnector:
    """Public Lever postings API."""

    provider = "lever"

    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def fetch_jobs(
        self,
        board_token: str,
        *,
        etag: str | None = None,
    ) -> tuple[list[CanonicalJob], str | None, bool]:
        url = f"https://api.lever.co/v0/postings/{board_token}"
        headers = {"If-None-Match": etag} if etag else None
        body, resp_headers, status = await get_json(
            self.client,
            url,
            headers=headers,
            params={"mode": "json"},
        )
        if status == 304:
            return [], etag, True

        jobs_raw = body if isinstance(body, list) else []
        company_name = board_token.replace("-", " ").title()
        results: list[CanonicalJob] = []
        for job in jobs_raw:
            job_id = str(job.get("id") or job.get("leverId") or "")
            if not job_id:
                continue
            lists = job.get("lists") or []
            desc_parts = [_strip_html(job.get("descriptionPlain") or job.get("description") or "")]
            for block in lists:
                desc_parts.append(_strip_html(block.get("text") or ""))
                for item in block.get("content") or []:
                    desc_parts.append(_strip_html(item))
            description = " ".join(p for p in desc_parts if p)
            categories = job.get("categories") or {}
            location = categories.get("location") or job.get("workplaceType")
            apply_url = job.get("hostedUrl") or job.get("applyUrl") or (
                f"https://jobs.lever.co/{board_token}/{job_id}"
            )
            posted_at = None
            if job.get("createdAt"):
                try:
                    posted_at = datetime.fromtimestamp(
                        job["createdAt"] / 1000, tz=timezone.utc
                    )
                except (TypeError, ValueError, OSError):
                    posted_at = None

            remote = None
            workplace = (job.get("workplaceType") or "").lower()
            if workplace == "remote":
                remote = True
            elif workplace in ("hybrid", "onsite", "on-site"):
                remote = False

            results.append(
                build_canonical_job(
                    source=AtsProvider.LEVER,
                    external_id=job_id,
                    company_slug=board_token.lower(),
                    company_name=company_name,
                    title=job.get("text") or "Untitled",
                    description_text=description,
                    apply_url=apply_url,
                    location=location,
                    remote=remote,
                    contract_type=categories.get("commitment"),
                    posted_at=posted_at,
                    raw=job,
                )
            )

        return results, resp_headers.get("etag"), False
