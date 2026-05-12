"""Shared language instruction utilities for LLM prompt injection.

Centralizes the language directive logic so all LLM nodes produce output
in the user's chosen language without duplicating the mapping logic.
"""

from __future__ import annotations

# ISO 639-1 code → full language name + prompt instruction
_LANGUAGE_MAP: dict[str, dict[str, str]] = {
    "en": {
        "name": "English",
        "instruction": "You MUST write your entire response in English.",
    },
    "fr": {
        "name": "French",
        "instruction": "Tu DOIS rédiger l'intégralité de ta réponse en français.",
    },
    "nl": {
        "name": "Dutch",
        "instruction": "Je MOET je volledige antwoord in het Nederlands schrijven.",
    },
}

DEFAULT_LANGUAGE = "en"


def get_language_instruction(language_code: str | None) -> str:
    """Return a system-level language directive for the given language code.

    Args:
        language_code: ISO 639-1 code (e.g. 'en', 'fr', 'nl').

    Returns:
        A clear instruction string to prepend/append to LLM system prompts.
    """
    code = (language_code or DEFAULT_LANGUAGE).lower()
    lang = _LANGUAGE_MAP.get(code, _LANGUAGE_MAP[DEFAULT_LANGUAGE])
    return lang["instruction"]


def get_language_name(language_code: str | None) -> str:
    """Return the human-readable language name for a given code."""
    code = (language_code or DEFAULT_LANGUAGE).lower()
    lang = _LANGUAGE_MAP.get(code, _LANGUAGE_MAP[DEFAULT_LANGUAGE])
    return lang["name"]
