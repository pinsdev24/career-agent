"""Tests for CV parser — PDF extraction and structuring."""

import pytest

from app.exceptions import CVParsingError
from app.tools.cv_parser import parse_pdf


class TestParsePdf:
    """Unit tests for PDF text extraction via PyMuPDF."""

    def test_extracts_text_from_valid_pdf(self, sample_pdf_bytes: bytes) -> None:
        text = parse_pdf(sample_pdf_bytes)
        assert "Jane Doe" in text
        assert "Python" in text
        assert "EXPERIENCE" in text.upper() or "Experience" in text

    def test_multipage_pdf_joins_with_newlines(self) -> None:
        import fitz
        doc = fitz.open()
        for i in range(3):
            page = doc.new_page()
            page.insert_text((50, 72), f"Page {i + 1} content here")
        pdf_bytes = doc.tobytes()
        doc.close()

        text = parse_pdf(pdf_bytes)
        assert "Page 1" in text
        assert "Page 2" in text
        assert "Page 3" in text

    def test_empty_bytes_raises_cv_parsing_error(self) -> None:
        with pytest.raises(CVParsingError, match="Empty file"):
            parse_pdf(b"")

    def test_invalid_bytes_raises_cv_parsing_error(self) -> None:
        with pytest.raises(CVParsingError):
            parse_pdf(b"this is not a pdf at all !!")

    def test_blank_pdf_raises_cv_parsing_error(self) -> None:
        """A PDF with no text content should raise CVParsingError."""
        import fitz
        doc = fitz.open()
        doc.new_page()  # blank page, no text
        pdf_bytes = doc.tobytes()
        doc.close()

        with pytest.raises(CVParsingError, match="No readable text"):
            parse_pdf(pdf_bytes)

    def test_rejects_pdf_above_page_limit(self) -> None:
        import fitz

        doc = fitz.open()
        for _ in range(3):
            page = doc.new_page()
            page.insert_text((50, 72), "CV content")
        pdf_bytes = doc.tobytes()
        doc.close()

        with pytest.raises(CVParsingError, match="too many pages"):
            parse_pdf(pdf_bytes, max_pages=2)

    def test_rejects_extracted_text_above_limit(self) -> None:
        import fitz

        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 72), "A" * 200)
        pdf_bytes = doc.tobytes()
        doc.close()

        with pytest.raises(CVParsingError, match="too large"):
            parse_pdf(pdf_bytes, max_text_chars=50)
