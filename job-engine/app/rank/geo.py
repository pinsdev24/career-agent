"""Location aliases and geo scoring — honest regional match, not US-default dump."""

from __future__ import annotations

import re
import unicodedata

# Groups are bidirectional: a pref in the group matches any term in the group.
# Keep 2-letter codes out of SQL ILIKE expansion (too many false positives).
# ISO 3166-1 alpha-2 is the country the group resolves to for the hard geo gate.
_LOCATION_GROUPS: tuple[tuple[str, frozenset[str]], ...] = (
    (
        "BE",
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
    ),
    (
        "NL",
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
    ),
    (
        "LU",
        frozenset(
            {
                "luxembourg",
                "luxemburg",
                "lëtzebuerg",
            }
        ),
    ),
    (
        "FR",
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
    ),
    (
        "DE",
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
    ),
    (
        "GB",
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
    ),
    (
        "IE",
        frozenset(
            {
                "ireland",
                "eire",
                "éire",
                "dublin",
                "cork",
            }
        ),
    ),
)

# Country / region names that are *not* alias-expanded into a match group.
# Used only to resolve a posting's country so a BE pref can hard-exclude AR/US/….
_COUNTRY_NAMES: dict[str, str] = {
    "argentina": "AR",
    "argentine": "AR",
    "argentinian": "AR",
    "argentinian republic": "AR",
    "united states": "US",
    "united states of america": "US",
    "usa": "US",
    "u.s": "US",
    "u.s.": "US",
    "u.s.a": "US",
    "u.s.a.": "US",
    "america": "US",
    "ukraine": "UA",
    "brasil": "BR",
    "brazil": "BR",
    "mexico": "MX",
    "méxico": "MX",
    "canada": "CA",
    "australia": "AU",
    "india": "IN",
    "colombia": "CO",
    "chile": "CL",
    "peru": "PE",
    "perú": "PE",
    "costa rica": "CR",
    "poland": "PL",
    "polska": "PL",
    "spain": "ES",
    "espana": "ES",
    "españa": "ES",
    "italy": "IT",
    "italia": "IT",
    "portugal": "PT",
    "switzerland": "CH",
    "suisse": "CH",
    "schweiz": "CH",
    "austria": "AT",
    "osterreich": "AT",
    "österreich": "AT",
    "sweden": "SE",
    "sverige": "SE",
    "norway": "NO",
    "norge": "NO",
    "denmark": "DK",
    "danmark": "DK",
    "finland": "FI",
    "romania": "RO",
    "china": "CN",
    "japan": "JP",
    # Remote.com AMER hubs that are not ISO countries but must not count as BE.
    "amer": "AMER",
    "americas": "AMER",
    "latam": "AMER",
    "latin america": "AMER",
}

# ISO-2 (plus UK) only when they appear as a comma/slash/pipe part — not as
# English words inside a sentence ("work in belgium" must not become India).
_ISO2_PARTS: dict[str, str] = {
    "be": "BE",
    "nl": "NL",
    "lu": "LU",
    "fr": "FR",
    "de": "DE",
    "gb": "GB",
    "uk": "GB",
    "ie": "IE",
    "ar": "AR",
    "us": "US",
    "ua": "UA",
    "br": "BR",
    "mx": "MX",
    "ca": "CA",
    "au": "AU",
    "pl": "PL",
    "es": "ES",
    "it": "IT",
    "pt": "PT",
    "ch": "CH",
    "at": "AT",
    "se": "SE",
    "no": "NO",
    "dk": "DK",
    "fi": "FI",
    "ro": "RO",
    "cn": "CN",
    "jp": "JP",
    "in": "IN",
    "cr": "CR",
    "cl": "CL",
    "pe": "PE",
    "co": "CO",
}

_WORLDWIDE_PREFS = frozenset(
    {
        "worldwide",
        "world wide",
        "anywhere",
        "anywhere remote",
        "remote worldwide",
        "worldwide remote",
        "global",
        "globally",
        "remote anywhere",
        "anywhere in the world",
    }
)

_MIN_SQL_ALIAS_LEN = 3
_ALIAS_OK = re.compile(r"^[\w][\w\s.'’-]*$", re.UNICODE)
_SPLIT_PARTS = re.compile(r"[,/;|()]+")
_WORD_TOKEN = re.compile(r"[a-z0-9][a-z0-9.'’-]*")


def _fold(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", text).strip().lower()


def _tokens(value: str) -> list[str]:
    folded = _fold(value)
    if not folded:
        return []
    parts = _SPLIT_PARTS.split(folded)
    out: list[str] = []
    for part in parts:
        part = part.strip(" .")
        if part:
            out.append(part)
        for token in _WORD_TOKEN.findall(part):
            if token not in out:
                out.append(token)
    return out


def _standalone_term(term: str, blob: str, tokens: set[str]) -> bool:
    """True when `term` is a whole token / word, never a substring of another word.

    `gent` must not hit `argentina`. `uk` must not hit `ukraine`.
    """
    if not term:
        return False
    if term in tokens or blob == term:
        return True
    return re.search(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", blob) is not None


def _is_worldwide_pref(pref: str) -> bool:
    folded = _fold(pref)
    return folded in _WORLDWIDE_PREFS


def _term_to_country() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for iso, group in _LOCATION_GROUPS:
        for term in group:
            mapping[_fold(term)] = iso
    mapping.update({_fold(name): iso for name, iso in _COUNTRY_NAMES.items()})
    return mapping


_TERM_TO_COUNTRY = _term_to_country()


def resolve_country_codes(location: str | None) -> frozenset[str]:
    """ISO (or AMER hub) codes implied by a location string after fold.

    City aliases use the same standalone-term rule as matching, so `gent`
    inside `argentina` does not resolve to BE.
    """
    folded = _fold(location or "")
    if not folded:
        return frozenset()
    tokens = set(_tokens(location or ""))
    found: set[str] = set()
    for term, iso in _TERM_TO_COUNTRY.items():
        if _standalone_term(term, folded, tokens):
            found.add(iso)
    for part in _SPLIT_PARTS.split(folded):
        code = _ISO2_PARTS.get(part.strip(" ."))
        if code:
            found.add(code)
    return frozenset(found)


def _match_terms(pref: str) -> list[str]:
    """Alias terms for honest matching, including short city tokens like gent/uk."""
    folded = _fold(pref)
    tokens = _tokens(pref)
    matched: set[str] = set()
    if folded:
        matched.add(folded)
    matched.update(tokens)
    for _iso, group in _LOCATION_GROUPS:
        if folded in group or any(t in group for t in tokens):
            matched.update(group)
    return [term for term in matched if term]


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

    for _iso, group in _LOCATION_GROUPS:
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
    """True when a posting location hits the preference or its aliases.

    Matching is token / word-boundary only (never raw substring). When the
    preference resolves to a country, postings that resolve to a *different*
    country are hard-excluded unless the user asked for worldwide remote.
    """
    if not (pref or "").strip():
        return True
    if _is_worldwide_pref(pref):
        return True
    blob = _fold(job_location or "")
    if not blob:
        return False

    pref_countries = resolve_country_codes(pref)
    job_countries = resolve_country_codes(job_location)
    if pref_countries and job_countries and pref_countries.isdisjoint(job_countries):
        return False

    job_tokens = set(_tokens(job_location or ""))
    for alias in _match_terms(pref):
        if _standalone_term(_fold(alias), blob, job_tokens):
            return True
    return False


WHY_LOCATION_MATCH = "why_location_match"


def geo_match_score(
    job_location: str | None,
    pref: str | None,
    *,
    job_country: str | None = None,
    pref_countries: list[str] | None = None,
    city_boost: bool = False,
) -> tuple[float, list[str]]:
    """0..1 geo contribution plus a short reason.

    When structured pref countries are set, the chip is only emitted if the
    posting country_code is in that list — never "Location matches X (WrongCountry)".
    """
    codes = [c.upper() for c in (pref_countries or []) if c]
    if codes:
        if job_country and job_country.upper() in codes:
            score = 1.0 if not city_boost else 1.0
            return score, [WHY_LOCATION_MATCH]
        return 0.0, []
    if not (pref or "").strip():
        return 0.0, []
    if location_matches(job_location, pref):
        # Legacy free-text path. Structured countries should be used instead.
        return 1.0, [WHY_LOCATION_MATCH]
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
