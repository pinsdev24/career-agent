"""Embedding backfill worker."""

from app.db.embeddings import embed_text, job_embed_text
from app.db.repository import JobRepository
from app.logging_setup import get_logger

logger = get_logger(__name__)


async def embed_pending_jobs(repo: JobRepository, limit: int = 40) -> int:
    """Embed jobs flagged embed_pending."""
    pending = await repo.list_pending_embed(limit=limit)
    done = 0
    for job in pending:
        try:
            text = job_embed_text(job)
            vector = await embed_text(text)
            await repo.store_embedding(job["id"], text, vector)
            done += 1
        except Exception as exc:
            logger.warning("embed_failed", job_id=job.get("id"), error=str(exc))
    logger.info("embed_batch_done", done=done, pending=len(pending))
    return done
