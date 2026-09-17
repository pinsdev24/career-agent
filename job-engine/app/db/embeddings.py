"""OpenAI embedding helpers."""

from openai import AsyncOpenAI

from app.config import get_settings
from app.logging_setup import get_logger

logger = get_logger(__name__)


def _client() -> AsyncOpenAI:
    settings = get_settings()
    kwargs: dict = {"api_key": settings.openai_api_key}
    if settings.openai_base_url:
        kwargs["base_url"] = settings.openai_base_url
    return AsyncOpenAI(**kwargs)


async def embed_text(text: str) -> list[float]:
    """Embed a single text string. Raises on provider errors."""
    settings = get_settings()
    client = _client()
    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=text[:8000],
        dimensions=settings.embedding_dimensions,
    )
    return response.data[0].embedding


async def embed_text_or_none(text: str) -> list[float] | None:
    """Best-effort embed — returns None if the provider rejects embeddings."""
    if not text.strip():
        return None
    try:
        return await embed_text(text)
    except Exception as exc:
        logger.warning("embed_failed", error=str(exc))
        return None


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts."""
    if not texts:
        return []
    settings = get_settings()
    client = _client()
    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=[t[:8000] for t in texts],
        dimensions=settings.embedding_dimensions,
    )
    by_index = sorted(response.data, key=lambda d: d.index)
    return [d.embedding for d in by_index]


def job_embed_text(job: dict) -> str:
    """Build embeddable text from a job row."""
    skills = job.get("skills") or []
    if isinstance(skills, list):
        skills_str = ", ".join(str(s) for s in skills)
    else:
        skills_str = ""
    parts = [
        job.get("title") or "",
        job.get("company_name") or "",
        job.get("location") or "",
        skills_str,
        (job.get("description_text") or "")[:4000],
    ]
    return "\n".join(p for p in parts if p)
