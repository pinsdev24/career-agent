"""Embedding utilities — OpenAI embeddings and chunk management."""

import logging
from dataclasses import dataclass

from langchain_openai import OpenAIEmbeddings

from app.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class ChunkEmbedding:
    """A text chunk with its embedding vector."""

    chunk_text: str
    chunk_type: str  # e.g. "skills", "experience", "education", "full"
    embedding: list[float]


# ---------------------------------------------------------------------------
# Embedding client
# ---------------------------------------------------------------------------


def _get_embeddings_client() -> OpenAIEmbeddings:
    """Build an OpenAI embeddings client.

    Note: In langchain-openai 1.x, `openai_api_key` is the correct field name
    (not `api_key`). The `dimensions` parameter is supported for text-embedding-3
    models only.
    """
    settings = get_settings()
    return OpenAIEmbeddings(
        model=settings.embedding_model,
        openai_api_key=settings.openai_api_key,  # correct field name in LC 1.x
        dimensions=settings.embedding_dimensions,
    )


async def embed_text(text: str) -> list[float]:
    """Generate an embedding vector for a single text."""
    client = _get_embeddings_client()
    return await client.aembed_query(text)


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a batch of texts."""
    client = _get_embeddings_client()
    return await client.aembed_documents(texts)


# ---------------------------------------------------------------------------
# CV semantic chunking + embedding
# ---------------------------------------------------------------------------

_SECTION_KEYWORDS = [
    "experience",
    "work experience",
    "professional experience",
    "education",
    "skills",
    "technical skills",
    "certifications",
    "languages",
    "projects",
    "summary",
    "objective",
    "publications",
    "volunteer",
]


def _chunk_cv(text: str, max_chunk_chars: int = 1000) -> list[tuple[str, str]]:
    """Split CV text into semantic chunks by section.

    Returns list of (chunk_text, chunk_type).
    Falls back to fixed-size chunks if no sections are detected.
    """
    text_lower = text.lower()

    # Detect section boundaries
    sections: list[tuple[int, str]] = []
    for keyword in _SECTION_KEYWORDS:
        idx = text_lower.find(keyword)
        if idx != -1:
            sections.append((idx, keyword.split()[0]))  # use first word as type

    if not sections:
        # Fallback: fixed-size chunks labeled "full"
        return [
            (text[i : i + max_chunk_chars].strip(), "full")
            for i in range(0, len(text), max_chunk_chars)
            if text[i : i + max_chunk_chars].strip()
        ]

    # Sort sections by position and extract text between boundaries
    sections.sort(key=lambda x: x[0])
    chunks: list[tuple[str, str]] = []
    for i, (start, section_type) in enumerate(sections):
        end = sections[i + 1][0] if i + 1 < len(sections) else len(text)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append((chunk[:max_chunk_chars], section_type))

    return chunks


async def chunk_and_embed(text: str) -> list[ChunkEmbedding]:
    """Chunk a CV and embed each chunk in a single batch request."""
    chunks = _chunk_cv(text)
    if not chunks:
        logger.warning("No chunks produced from CV text")
        return []

    chunk_texts = [c[0] for c in chunks]
    chunk_types = [c[1] for c in chunks]

    # Single batch call — more efficient than per-chunk requests
    embeddings = await embed_texts(chunk_texts)

    return [
        ChunkEmbedding(
            chunk_text=text_,
            chunk_type=type_,
            embedding=emb,
        )
        for text_, type_, emb in zip(chunk_texts, chunk_types, embeddings)
    ]
