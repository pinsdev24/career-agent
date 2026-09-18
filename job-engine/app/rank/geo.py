"""Location aliases and geo scoring — honest regional match, not US-default dump."""

from __future__ import annotations

import re
import unicodedata

# Groups are bidirectional: a pref in the group matches any term in the group.
# Keep 2-letter codes out of SQL ILIKE expansion (too many false positives).
_LOCATION_GROUPS: tuple[frozenset[str], ...] = (
    frozenset(
        {
            "belgium",
            "belgique",
            "belgie",
            "belgië",
            "belgien",
            "belgian",
            "brussels",
            "bruxelles",
            "brussel",
            "ghent",
            "gent",
            "gand",
            "antwerp",
            "antwerpen",
            "anvers",
            "bruges",
            "brugge",
            "liege",
            "liège",
            "luik",
            "leuven",
            "louvain",
            "namur",
            "namen",
            "charleroi",
            "mechelen",
            "malines",
            "ostend",
            "oostende",
            "ostende",
            "flanders",
            "vlaanderen",
            "flandre",
            "wallonia",
            "wallonie",
            "wallonië",
        }
    ),
    frozenset(
        {
            "netherlands",
            "nederland",
            "holland",
            "amsterdam",
            "rotterdam",
            "utrecht",
            "eindhoven",
            "the hague",
            "den haag",
            "'s-gravenhage",
        }
    ),
    frozenset(
        {
            "luxembourg",
            "luxemburg",
            "lëtzebuerg",
        }
    ),
    frozenset(
        {
            "france",
            "paris",
            "lyon",
            "lille",
            "marseille",
            "toulouse",
            "nantes",
            "bordeaux",
            "île-de-france",
            "ile-de-france",
        }
    ),
    frozenset(
        {
            "germany",
            "deutschland",
            "berlin",
            "munich",
            "münchen",
            "munchen",
            "hamburg",
            "frankfurt",
            "cologne",
            "köln",
            "koln",
            "düsseldorf",
            "dusseldorf",
        }
    ),
    frozenset(
        {
            "united kingdom",
            "uk",
            "great britain",
            "england",
            "london",
            "manchester",
            "edinburgh",
        }
    ),
    frozenset(
        {
            "ireland",
            "eire",
            "éire",
            "dublin",
            "cork",
        }
    ),
)

_MIN_SQL_ALIAS_LEN = 3
_ALIAS_OK = re.compile(r"^[\w][\w\s.'’-]*$", re.UNICODE)


def _fold(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", text).strip().lower()


def _tokens(value: str) -> list[str]:
    folded = _fold(value)
    if not folded:
        return []
    parts = re.split(r"[,/;|()]+", folded)
    out: list[str] = []
    for part in parts:
        part = part.strip(" .")
        if part:
            out.append(part)
        for token in re.findall(r"[a-z0-9][a-z0-9.'’-]*", part):
            if token not in out:
                out.append(token)
    return out


def expand_location_aliases(location: str | None) -> list[str]:
    """Return ILIKE-safe alias terms for a user location preference.

    Example: Belgium → belgium, bruxelles, brussels, gent, antwerp, …
    """
    raw = (location or "").strip()
    if not raw:
        return []

    folded = _fold(raw)
    matched: set[str] = set()
    tokens = _tokens(raw)

    for group in _LOCATION_GROUPS:
        if folded in group or any(t in group for t in tokens):
            matched.update(group)

    # Always keep the user's own phrasing (folded + original words).
    matched.add(folded)
    for token in tokens:
        if len(token) >= _MIN_SQL_ALIAS_LEN:
            matched.add(token)

    aliases: list[str] = []
    seen: set[str] = set()
    # Prefer the original string, then the rest alphabetically (full group).
    ordered = [raw, folded, *sorted(matched, key=str.lower)]
    for term in ordered:
        clean = term.strip()
        if len(clean) < _MIN_SQL_ALIAS_LEN:
            continue
        if not _ALIAS_OK.match(clean):
            continue
        key = _fold(clean)
        if key in seen:
            continue
        seen.add(key)
        aliases.append(clean)
    return aliases[:48]


def location_rpc_filter(location: str | None) -> str | None:
    """Pipe-separated aliases for SQL RPCs (see migration 006)."""
    aliases = expand_location_aliases(location)
    if not aliases:
        return None
    return "|".join(aliases)


def location_matches(job_location: str | None, pref: str | None) -> bool:
    """True when a posting location hits the preference or its aliases."""
    if not (pref or "").strip():
        return True
    blob = _fold(job_location or "")
    if not blob:
        return False
    for alias in expand_location_aliases(pref):
        needle = _fold(alias)
        if needle and needle in blob:
            return True
        if re.search(rf"\b{re.escape(needle)}\b", blob):
            return True
    return False


def geo_match_score(job_location: str | None, pref: str | None) -> tuple[float, list[str]]:
    """0..1 geo contribution plus a short reason."""
    if not (pref or "").strip():
        return 0.0, []
    if location_matches(job_location, pref):
        label = (job_location or "").strip() or pref.strip()
        return 1.0, [f'Location matches "{pref.strip()}" ({label})']
    return 0.0, []


def remote_pref_to_filter(pref: str | None) -> bool | None:
    """Map first-run / settings remote_preference to a boolean filter.

    onsite → False (exclude remote=true). remote → True. hybrid/unknown → None.
    """
    value = (pref or "").strip().lower()
    if value in {"remote", "fully remote"}:
        return True
    if value in {"onsite", "on-site", "on site", "office", "in-office"}:
        return False
    return None
