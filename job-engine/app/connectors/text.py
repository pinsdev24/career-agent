"""Shared HTML → text for ATS JSON payloads."""

import re
from html import unescape

_HTML_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")


def strip_html(html: str | None) -> str:
    text = _HTML_TAG.sub(" ", html or "")
    return unescape(_WS.sub(" ", text)).strip()
