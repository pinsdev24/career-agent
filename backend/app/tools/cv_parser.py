"""CV parsing utilities — PDF text extraction and LLM structuring."""

import logging

import fitz  # PyMuPDF
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import get_settings
from app.exceptions import CVParsingError, LLMError

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Structured output schema
# ---------------------------------------------------------------------------


class ExperienceItem(BaseModel):
    title: str
    company: str
    duration: str | None = None
    description: str | None = None


class EducationItem(BaseModel):
    degree: str
    institution: str
    year: str | None = None


class LanguageItem(BaseModel):
    language: str
    level: str | None = None


class StructuredCV(BaseModel):
    """Fully structured representation of a CV."""

    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    summary: str | None = Field(None, description="Brief professional summary")
    skills: list[str] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    languages: list[LanguageItem] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)


SYSTEM_PROMPT = (
    "You are an expert CV analyst. Extract all structured information from the CV text. "
    "Be thorough and accurate. Only include information explicitly present in the CV."
)


# ---------------------------------------------------------------------------
# PDF text extraction
# ---------------------------------------------------------------------------


def parse_pdf(file_bytes: bytes) -> str:
    """Extract raw text from a PDF file using PyMuPDF.

    Args:
        file_bytes: Raw PDF file bytes.

    Returns:
        Extracted text, page-separated.

    Raises:
        CVParsingError: If extraction fails or file is not valid PDF.
    """
    if not file_bytes:
        raise CVParsingError("Empty file provided")

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages: list[str] = []
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                pages.append(text)
        doc.close()

        if not pages:
            raise CVParsingError("No readable text found in the PDF")

        return "\n\n".join(pages)

    except CVParsingError:
        raise
    except Exception as exc:
        logger.error("PDF parsing failed: %s", exc)
        raise CVParsingError(f"Failed to parse PDF: {exc}") from exc


# ---------------------------------------------------------------------------
# LLM-powered CV structuring
# ---------------------------------------------------------------------------


async def structure_cv(raw_text: str) -> dict:
    """Structure raw CV text using LLM with_structured_output.

    Uses Pydantic schema — no JSON parsing needed.
    """
    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.openai_api_key,
        temperature=0,
    )
    structured_llm = llm.with_structured_output(StructuredCV)

    try:
        result: StructuredCV = await structured_llm.ainvoke(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                SystemMessage(content=f"CV TEXT:\n{raw_text[:8000]}"),
            ]
        )
        return result.model_dump()
    except Exception as exc:
        logger.error("CV structuring LLM call failed: %s", exc)
        raise LLMError(f"CV structuring failed: {exc}") from exc
