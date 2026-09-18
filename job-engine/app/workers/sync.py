"""Board sync worker logic."""

from pathlib import Path

import httpx
import yaml

from app.config import get_settings
from app.connectors.factory import get_connector
from app.connectors.rate_limit import TokenBucket
from app.db.repository import JobRepository
from app.logging_setup import get_logger
from app.metrics import INGEST_ERRORS, INGEST_UPSERTS
from app.quality.gates import passes_content_gates

logger = get_logger(__name__)

_DEAD_BOARD_STATUSES = {404, 410, 422}


async def sync_company_board(
    repo: JobRepository,
    redis,
    company: dict,
    http_client: httpx.AsyncClient,
) -> dict:
    """Sync one company board; expire missing postings; cap dead/empty boards."""
    provider = company["ats_provider"]
    token = company["board_token"]
    run_id = await repo.start_ingest_run(provider, company.get("slug"))
    errors: list[str] = []
    upserted = 0
    expired = 0
    skipped = 0
    settings = get_settings()

    try:
        bucket = TokenBucket(redis, provider)
        await bucket.acquire()
        connector = get_connector(provider, http_client)
        jobs, new_etag, not_modified = await connector.fetch_jobs(
            token,
            etag=company.get("etag"),
        )
        if not_modified:
            await repo.update_company_sync(company["id"], etag=company.get("etag"))
            await repo.finish_ingest_run(
                run_id,
                upserted=0,
                expired=0,
                skipped=0,
                meta={"not_modified": True},
            )
            return {"not_modified": True}

        if not jobs:
            empty_count = int(company.get("consecutive_empty_syncs") or 0) + 1
            await repo.record_company_sync_counts(
                company["id"], consecutive_empty_syncs=empty_count
            )
            await repo.update_company_sync(company["id"], etag=new_etag)
            if empty_count >= settings.empty_board_deactivate_after:
                await repo.deactivate_company(
                    company["id"], reason=f"empty_board_x{empty_count}"
                )
            await repo.finish_ingest_run(
                run_id,
                upserted=0,
                meta={"empty_board": True, "consecutive_empty_syncs": empty_count},
            )
            return {"empty": True, "consecutive_empty_syncs": empty_count, "deactivated": empty_count >= settings.empty_board_deactivate_after}

        valid = [j for j in jobs if passes_content_gates(j.description_text, min_chars=40)]
        changed_ids, skipped = await repo.upsert_jobs(valid, company_id=company["id"])
        upserted = len(changed_ids) + skipped
        seen = {j.external_id for j in valid}
        expired = await repo.expire_missing(
            company_id=company["id"],
            source=provider,
            seen_external_ids=seen,
        )
        await repo.record_company_sync_counts(company["id"], consecutive_empty_syncs=0)
        await repo.update_company_sync(company["id"], etag=new_etag)
        INGEST_UPSERTS.labels(source=provider).inc(len(changed_ids))
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code if exc.response is not None else 0
        logger.warning(
            "sync_http_error",
            company=company.get("slug"),
            status=status,
            error=str(exc),
        )
        errors.append(str(exc))
        INGEST_ERRORS.labels(source=provider).inc()
        if status in _DEAD_BOARD_STATUSES:
            await repo.deactivate_company(company["id"], reason=f"http_{status}")
    except Exception as exc:
        logger.exception("sync_failed", company=company.get("slug"), error=str(exc))
        errors.append(str(exc))
        INGEST_ERRORS.labels(source=provider).inc()

    await repo.finish_ingest_run(
        run_id,
        upserted=upserted,
        expired=expired,
        skipped=skipped,
        errors=errors,
    )
    return {
        "upserted": upserted,
        "expired": expired,
        "skipped": skipped,
        "errors": errors,
    }


async def seed_companies_from_yaml(repo: JobRepository, path: Path | None = None) -> int:
    """Load companies.seed.yaml into the companies table."""
    seed_path = path or Path(__file__).resolve().parents[2] / "companies.seed.yaml"
    if not seed_path.exists():
        logger.warning("seed_missing", path=str(seed_path))
        return 0
    data = yaml.safe_load(seed_path.read_text()) or {}
    companies = data.get("companies") or []
    count = 0
    for row in companies:
        await repo.upsert_company(
            slug=row["slug"],
            name=row.get("name") or row["slug"],
            ats_provider=row["ats_provider"],
            board_token=row["board_token"],
            careers_url=row.get("careers_url"),
        )
        count += 1
    logger.info("companies_seeded", count=count)
    return count
