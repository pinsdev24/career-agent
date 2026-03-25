"""Tests for embedding tools — chunking logic (no API calls)."""

import pytest

from app.tools.embedding_tools import _chunk_cv, ChunkEmbedding


class TestChunkCv:
    """Test the semantic chunking logic (pure Python, no API)."""

    def test_chunks_cv_by_sections(self, sample_cv_text: str) -> None:
        chunks = _chunk_cv(sample_cv_text)
        assert len(chunks) >= 1
        # Should detect at least skills, experience, education, summary
        chunk_types = [c[1] for c in chunks]
        assert any(t in ("skills", "experience", "education", "summary") for t in chunk_types)

    def test_returns_list_of_tuples(self, sample_cv_text: str) -> None:
        chunks = _chunk_cv(sample_cv_text)
        for text, chunk_type in chunks:
            assert isinstance(text, str)
            assert isinstance(chunk_type, str)
            assert len(text) > 0

    def test_respects_max_chunk_size(self) -> None:
        long_text = "skills section\n" + "x " * 600  # >1000 chars after section label
        chunks = _chunk_cv(long_text, max_chunk_chars=200)
        for text, _ in chunks:
            assert len(text) <= 200

    def test_fallback_to_fixed_chunks_when_no_sections(self) -> None:
        plain_text = "This is just some text with no section headers at all."
        chunks = _chunk_cv(plain_text)
        assert len(chunks) >= 1
        for _, chunk_type in chunks:
            assert chunk_type == "full"

    def test_empty_text_returns_empty_list(self) -> None:
        chunks = _chunk_cv("")
        assert chunks == []

    def test_short_text_produces_one_chunk(self) -> None:
        text = "Short resume with minimal content."
        chunks = _chunk_cv(text)
        # Should produce at least one chunk
        assert len(chunks) >= 1


class TestChunkEmbeddingDataclass:
    """Test the ChunkEmbedding dataclass."""

    def test_chunk_embedding_stores_fields(self) -> None:
        ce = ChunkEmbedding(
            chunk_text="Python developer",
            chunk_type="skills",
            embedding=[0.1, 0.2, 0.3],
        )
        assert ce.chunk_text == "Python developer"
        assert ce.chunk_type == "skills"
        assert ce.embedding == [0.1, 0.2, 0.3]
