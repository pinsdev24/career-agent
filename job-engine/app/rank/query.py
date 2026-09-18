"""Build lexical recommend queries from the user's profile — never a role-family default."""

from __future__ import annotations

from typing import Any


def _clean(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return text


def _cv_title(cv: dict[str, Any]) -> str:
    for key in ("title", "headline", "current_title", "desired_title"):
        text = _clean(cv.get(key))
        if text:
            return text[:120]
    experience = cv.get("experience") or []
    if isinstance(experience, list):
        for row in experience:
            if not isinstance(row, dict):
                continue
            text = _clean(row.get("title") or row.get("role") or row.get("position"))
            if text:
                return text[:120]
    summary = _clean(cv.get("summary"))
    if summary:
        return summary[:80]
    return ""


def _cv_skills(cv: dict[str, Any], *, limit: int = 6) -> list[str]:
    raw = cv.get("skills") or []
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        text = _clean(item)
        key = text.lower()
        if not text or key in seen:
            continue
        seen.add(key)
        out.append(text)
        if len(out) >= limit:
            break
    return out


def build_recommend_query(
    prefs: dict[str, Any] | None,
    cv_structured: dict[str, Any] | None = None,
) -> str:
    """Lexical query from target title + CV. Empty if the profile has no title signal.

    Never falls back to a hardcoded role such as "software engineer".
    """
    prefs = prefs or {}
    cv = cv_structured or {}
    title = _clean(prefs.get("job_title")) or _cv_title(cv)
    skills = _cv_skills(cv)
    parts = [p for p in (title, " ".join(skills)) if p]
    return " ".join(parts).strip()
