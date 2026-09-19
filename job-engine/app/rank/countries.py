"""ISO country codes from ATS location strings — token match, never substring ILIKE.

Cut 3a: ingest stores country_code on job_postings. Ranking filters on codes.
This module does **not** change location_matches() substring behavior (P0 is a
separate PR). Token equality here is how we resolve a posting to BE vs AR.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

# ISO 3166-1 alpha-2. "UK" is commonly used in ATS boards; map to GB.
_ISO_EXCEPTIONS: dict[str, str] = {"UK": "GB", "EU": "", "EL": "GR"}

# Folded alias → ISO. Names and demonyms only — cities live in _CITY_TO_COUNTRY.
_COUNTRY_ALIASES: dict[str, str] = {
    "afghanistan": "AF",
    "albania": "AL",
    "algeria": "DZ",
    "argentina": "AR",
    "armenia": "AM",
    "australia": "AU",
    "austria": "AT",
    "osterreich": "AT",
    "österreich": "AT",
    "bangladesh": "BD",
    "belarus": "BY",
    "belgium": "BE",
    "belgique": "BE",
    "belgie": "BE",
    "belgië": "BE",
    "belgien": "BE",
    "belgian": "BE",
    "bolivia": "BO",
    "bosnia": "BA",
    "brazil": "BR",
    "brasil": "BR",
    "bulgaria": "BG",
    "cambodia": "KH",
    "cameroon": "CM",
    "canada": "CA",
    "chile": "CL",
    "china": "CN",
    "colombia": "CO",
    "costa rica": "CR",
    "croatia": "HR",
    "hrvatska": "HR",
    "cyprus": "CY",
    "czech republic": "CZ",
    "czechia": "CZ",
    "cesko": "CZ",
    "denmark": "DK",
    "danmark": "DK",
    "ecuador": "EC",
    "egypt": "EG",
    "estonia": "EE",
    "ethiopia": "ET",
    "finland": "FI",
    "suomi": "FI",
    "france": "FR",
    "french": "FR",
    "georgia": "GE",
    "germany": "DE",
    "deutschland": "DE",
    "german": "DE",
    "ghana": "GH",
    "greece": "GR",
    "ellas": "GR",
    "hong kong": "HK",
    "hungary": "HU",
    "magyarorszag": "HU",
    "iceland": "IS",
    "india": "IN",
    "indonesia": "ID",
    "iran": "IR",
    "iraq": "IQ",
    "ireland": "IE",
    "eire": "IE",
    "éire": "IE",
    "israel": "IL",
    "italy": "IT",
    "italia": "IT",
    "ivory coast": "CI",
    "cote divoire": "CI",
    "japan": "JP",
    "jordan": "JO",
    "kenya": "KE",
    "korea": "KR",
    "south korea": "KR",
    "kuwait": "KW",
    "latvia": "LV",
    "lebanon": "LB",
    "lithuania": "LT",
    "luxembourg": "LU",
    "luxemburg": "LU",
    "letzebuerg": "LU",
    "lëtzebuerg": "LU",
    "malaysia": "MY",
    "malta": "MT",
    "mexico": "MX",
    "morocco": "MA",
    "maroc": "MA",
    "netherlands": "NL",
    "nederland": "NL",
    "holland": "NL",
    "dutch": "NL",
    "new zealand": "NZ",
    "nigeria": "NG",
    "norway": "NO",
    "norge": "NO",
    "oman": "OM",
    "pakistan": "PK",
    "peru": "PE",
    "philippines": "PH",
    "poland": "PL",
    "polska": "PL",
    "portugal": "PT",
    "qatar": "QA",
    "romania": "RO",
    "russia": "RU",
    "saudi arabia": "SA",
    "senegal": "SN",
    "serbia": "RS",
    "singapore": "SG",
    "slovakia": "SK",
    "slovenia": "SI",
    "south africa": "ZA",
    "spain": "ES",
    "espana": "ES",
    "españa": "ES",
    "sri lanka": "LK",
    "sweden": "SE",
    "sverige": "SE",
    "switzerland": "CH",
    "schweiz": "CH",
    "suisse": "CH",
    "svizzera": "CH",
    "taiwan": "TW",
    "tanzania": "TZ",
    "thailand": "TH",
    "tunisia": "TN",
    "turkey": "TR",
    "turkiye": "TR",
    "uganda": "UG",
    "ukraine": "UA",
    "united arab emirates": "AE",
    "uae": "AE",
    "emirates": "AE",
    "united kingdom": "GB",
    "great britain": "GB",
    "britain": "GB",
    "england": "GB",
    "scotland": "GB",
    "wales": "GB",
    "northern ireland": "GB",
    "united states": "US",
    "united states of america": "US",
    "usa": "US",
    "america": "US",
    "uruguay": "UY",
    "venezuela": "VE",
    "vietnam": "VN",
    "zimbabwe": "ZW",
}

# City / region aliases → ISO. Matched as whole tokens only (gent ≠ argentina).
_CITY_TO_COUNTRY: dict[str, str] = {
    # Belgium
    "brussels": "BE",
    "bruxelles": "BE",
    "brussel": "BE",
    "ghent": "BE",
    "gent": "BE",
    "gand": "BE",
    "antwerp": "BE",
    "antwerpen": "BE",
    "anvers": "BE",
    "bruges": "BE",
    "brugge": "BE",
    "liege": "BE",
    "liège": "BE",
    "luik": "BE",
    "leuven": "BE",
    "louvain": "BE",
    "namur": "BE",
    "namen": "BE",
    "charleroi": "BE",
    "mechelen": "BE",
    "malines": "BE",
    "ostend": "BE",
    "oostende": "BE",
    "ostende": "BE",
    "flanders": "BE",
    "vlaanderen": "BE",
    "flandre": "BE",
    "wallonia": "BE",
    "wallonie": "BE",
    "wallonië": "BE",
    # Netherlands
    "amsterdam": "NL",
    "rotterdam": "NL",
    "utrecht": "NL",
    "eindhoven": "NL",
    "the hague": "NL",
    "den haag": "NL",
    "gravenhage": "NL",
    # Luxembourg
    "luxembourg city": "LU",
    # France
    "paris": "FR",
    "lyon": "FR",
    "lille": "FR",
    "marseille": "FR",
    "toulouse": "FR",
    "nantes": "FR",
    "bordeaux": "FR",
    "ile-de-france": "FR",
    "île-de-france": "FR",
    "ile de france": "FR",
    # Germany
    "berlin": "DE",
    "munich": "DE",
    "munchen": "DE",
    "münchen": "DE",
    "hamburg": "DE",
    "frankfurt": "DE",
    "cologne": "DE",
    "koln": "DE",
    "köln": "DE",
    "dusseldorf": "DE",
    "düsseldorf": "DE",
    # UK / IE
    "london": "GB",
    "manchester": "GB",
    "edinburgh": "GB",
    "dublin": "IE",
    "cork": "IE",
    # Spain / Italy / Portugal / CH
    "madrid": "ES",
    "barcelona": "ES",
    "rome": "IT",
    "roma": "IT",
    "milan": "IT",
    "milano": "IT",
    "lisbon": "PT",
    "lisboa": "PT",
    "zurich": "CH",
    "zürich": "CH",
    "geneva": "CH",
    "geneve": "CH",
    "genève": "CH",
    # US / CA / AR (AMER hubs that showed up in dogfood)
    "new york": "US",
    "nyc": "US",
    "san francisco": "US",
    "sf": "US",
    "seattle": "US",
    "austin": "US",
    "boston": "US",
    "chicago": "US",
    "los angeles": "US",
    "toronto": "CA",
    "montreal": "CA",
    "vancouver": "CA",
    "buenos aires": "AR",
    "cordoba": "AR",
    "córdoba": "AR",
}

# ISO codes we accept as standalone tokens when they look like codes (uppercase
# original, or a comma/slash-delimited part of length 2).
_ISO_CODES: frozenset[str] = frozenset(
    {
        "AD", "AE", "AF", "AL", "AM", "AR", "AT", "AU", "BA", "BD", "BE", "BG",
        "BO", "BR", "BY", "CA", "CH", "CL", "CM", "CN", "CO", "CR", "CY", "CZ",
        "DE", "DK", "DZ", "EC", "EE", "EG", "ES", "ET", "FI", "FR", "GB", "GE",
        "GH", "GR", "HK", "HR", "HU", "ID", "IE", "IL", "IN", "IQ", "IR", "IS",
        "IT", "JO", "JP", "KE", "KH", "KR", "KW", "LB", "LK", "LT", "LU", "LV",
        "MA", "MT", "MX", "MY", "NG", "NL", "NO", "NZ", "OM", "PE", "PH", "PK",
        "PL", "PT", "QA", "RO", "RS", "RU", "SA", "SE", "SG", "SI", "SK", "SN",
        "TH", "TN", "TR", "TW", "TZ", "UA", "UG", "US", "UY", "VE", "VN", "ZA",
        "ZW",
    }
)

# Ambiguous 2-letter tokens that also appear as English words.
_AMBIGUOUS_ISO = frozenset({"IN", "ME", "NO", "US", "BE", "OR", "TO", "SO", "AM"})

_REMOTE_TOKENS = frozenset(
    {"remote", "worldwide", "global", "anywhere", "hybrid", "teletravail", "télétravail"}
)


def _fold(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", text).strip().lower()


def _parts(value: str) -> list[str]:
    folded = _fold(value)
    if not folded:
        return []
    return [p.strip(" .") for p in re.split(r"[,/;|()]+", folded) if p.strip(" .")]


def _tokens(value: str) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for part in _parts(value):
        if part not in seen:
            seen.add(part)
            out.append(part)
        for token in re.findall(r"[a-z0-9][a-z0-9.'’-]*", part):
            if token not in seen:
                seen.add(token)
                out.append(token)
    return out


def _looks_like_iso_token(original: str, folded_token: str) -> bool:
    code = folded_token.upper()
    if code in _ISO_EXCEPTIONS:
        code = _ISO_EXCEPTIONS[code] or code
    if code not in _ISO_CODES and folded_token.upper() not in {"UK"}:
        return False
    if folded_token.upper() == "UK":
        return True
    # Uppercase in the original string ( ", BE" / "US" ) is a strong signal.
    if re.search(rf"(?<![A-Za-z]){re.escape(folded_token.upper())}(?![A-Za-z])", original or ""):
        return True
    if code in _AMBIGUOUS_ISO:
        # Only accept ambiguous codes as a delimited part ("Brussels, BE").
        parts = [p.strip() for p in re.split(r"[,/;|()]+", original or "") if p.strip()]
        return any(_fold(p) == folded_token and len(_fold(p)) == 2 for p in parts)
    return True


def _alias_country(token: str) -> str | None:
    if token in _COUNTRY_ALIASES:
        return _COUNTRY_ALIASES[token]
    if token in _CITY_TO_COUNTRY:
        return _CITY_TO_COUNTRY[token]
    return None


@dataclass(frozen=True)
class ParsedLocation:
    country_code: str | None
    city: str | None
    remote_hint: bool


def parse_posting_location(location: str | None) -> ParsedLocation:
    """Resolve an ATS location string to ISO country + optional city."""
    raw = (location or "").strip()
    if not raw:
        return ParsedLocation(None, None, False)

    folded = _fold(raw)
    tokens = _tokens(raw)
    remote_hint = any(t in _REMOTE_TOKENS for t in tokens) or "remote" in folded

    country: str | None = None
    # 1) Country names (longest aliases first) as whole tokens / parts.
    aliases_by_len = sorted(_COUNTRY_ALIASES.keys(), key=len, reverse=True)
    for alias in aliases_by_len:
        if alias in tokens or alias == folded:
            country = _COUNTRY_ALIASES[alias]
            break
        # Multi-word alias as substring of a comma-part is OK ("New York, United States").
        if " " in alias and alias in folded:
            country = _COUNTRY_ALIASES[alias]
            break

    # 2) ISO codes (token / delimited), including UK → GB.
    if country is None:
        for token in tokens:
            if _looks_like_iso_token(raw, token):
                mapped = _ISO_EXCEPTIONS.get(token.upper(), token.upper())
                if mapped in _ISO_CODES:
                    country = mapped
                    break

    # 3) Known cities as whole tokens only — this is how Gent → BE and
    #    Argentina stays AR (token "argentina" never equals city "gent").
    if country is None:
        for token in tokens:
            city_country = _CITY_TO_COUNTRY.get(token)
            if city_country:
                country = city_country
                break

    city: str | None = None
    parts = [p.strip() for p in re.split(r"[,/;|()]+", raw) if p.strip()]
    for part in parts:
        folded_part = _fold(part)
        if folded_part in _REMOTE_TOKENS or folded_part in _COUNTRY_ALIASES:
            continue
        if len(folded_part) == 2 and folded_part.upper() in _ISO_CODES | {"UK"}:
            continue
        if folded_part in _CITY_TO_COUNTRY or re.search(r"[a-z]", folded_part):
            # Skip if this part resolved as the country name.
            if _COUNTRY_ALIASES.get(folded_part) == country:
                continue
            city = part.strip()
            break

    return ParsedLocation(country_code=country, city=city, remote_hint=remote_hint)


def countries_from_text(location: str | None) -> list[str]:
    """Best-effort ISO list from free-text search_preferences.location."""
    raw = (location or "").strip()
    if not raw:
        return []
    parsed = parse_posting_location(raw)
    if parsed.country_code:
        return [parsed.country_code]
    # Multiple countries in one string: "Belgium / Netherlands"
    found: list[str] = []
    seen: set[str] = set()
    for token in _tokens(raw):
        code = _alias_country(token)
        if code and code not in seen:
            seen.add(code)
            found.append(code)
        elif _looks_like_iso_token(raw, token):
            mapped = _ISO_EXCEPTIONS.get(token.upper(), token.upper())
            if mapped in _ISO_CODES and mapped not in seen:
                seen.add(mapped)
                found.append(mapped)
    return found


def posting_country_code(row: dict) -> str | None:
    stored = (row.get("country_code") or "").strip().upper()
    if len(stored) == 2:
        return stored
    return parse_posting_location(row.get("location")).country_code


def country_display_name(code: str, locale: str = "en") -> str:
    names = COUNTRY_LABELS.get(code.upper()) or {}
    return names.get(locale) or names.get("en") or code.upper()


# Labels for UI-adjacent engine tests and demand-pack query strings.
COUNTRY_LABELS: dict[str, dict[str, str]] = {
    "AR": {"en": "Argentina", "fr": "Argentine", "nl": "Argentinië"},
    "AT": {"en": "Austria", "fr": "Autriche", "nl": "Oostenrijk"},
    "AU": {"en": "Australia", "fr": "Australie", "nl": "Australië"},
    "BE": {"en": "Belgium", "fr": "Belgique", "nl": "België"},
    "BR": {"en": "Brazil", "fr": "Brésil", "nl": "Brazilië"},
    "CA": {"en": "Canada", "fr": "Canada", "nl": "Canada"},
    "CH": {"en": "Switzerland", "fr": "Suisse", "nl": "Zwitserland"},
    "DE": {"en": "Germany", "fr": "Allemagne", "nl": "Duitsland"},
    "DK": {"en": "Denmark", "fr": "Danemark", "nl": "Denemarken"},
    "ES": {"en": "Spain", "fr": "Espagne", "nl": "Spanje"},
    "FI": {"en": "Finland", "fr": "Finlande", "nl": "Finland"},
    "FR": {"en": "France", "fr": "France", "nl": "Frankrijk"},
    "GB": {"en": "United Kingdom", "fr": "Royaume-Uni", "nl": "Verenigd Koninkrijk"},
    "IE": {"en": "Ireland", "fr": "Irlande", "nl": "Ierland"},
    "IN": {"en": "India", "fr": "Inde", "nl": "India"},
    "IT": {"en": "Italy", "fr": "Italie", "nl": "Italië"},
    "LU": {"en": "Luxembourg", "fr": "Luxembourg", "nl": "Luxemburg"},
    "NL": {"en": "Netherlands", "fr": "Pays-Bas", "nl": "Nederland"},
    "NO": {"en": "Norway", "fr": "Norvège", "nl": "Noorwegen"},
    "PL": {"en": "Poland", "fr": "Pologne", "nl": "Polen"},
    "PT": {"en": "Portugal", "fr": "Portugal", "nl": "Portugal"},
    "SE": {"en": "Sweden", "fr": "Suède", "nl": "Zweden"},
    "SG": {"en": "Singapore", "fr": "Singapour", "nl": "Singapore"},
    "US": {"en": "United States", "fr": "États-Unis", "nl": "Verenigde Staten"},
}


def country_query_names(code: str) -> list[str]:
    labels = COUNTRY_LABELS.get(code.upper()) or {}
    names = [labels[k] for k in ("en", "fr", "nl") if labels.get(k)]
    return names or [code.upper()]
