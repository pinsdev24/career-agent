"""Profile-driven Tavily demand packs — title + location + ATS hosts, no company list."""

from __future__ import annotations

from typing import Any

from app.connectors.registry import discovery_hosts
from app.rank.countries import countries_from_text, country_query_names
from app.rank.geo import expand_location_aliases

# Public ATS hosts we already know how to sync (not Personio / new adapters).
# Sourced from the connector registry so ATS #6 is one spec, not another list.

RoleFamily = str  # eng | data | embedded | business | sales | general

_FAMILY_KEYWORDS: tuple[tuple[RoleFamily, tuple[str, ...]], ...] = (
    (
        "embedded",
        (
            "embedded",
            "firmware",
            "fpga",
            "rtos",
            "mcu",
            "electronics",
            "hardware",
            "iot",
            "bare metal",
            "embarqué",
            "embarque",
        ),
    ),
    (
        "data",
        (
            "data scientist",
            "data engineer",
            "machine learning",
            "ml engineer",
            "mlops",
            "analyst",
            "analytics",
            "data-analist",
            "données",
            "donnees",
        ),
    ),
    (
        "sales",
        (
            "sales",
            "account executive",
            "account manager",
            "sdr",
            "bdr",
            "customer success",
            "business development",
            "commercial",
            "verkoop",
            "account executive",
        ),
    ),
    (
        "business",
        (
            "product manager",
            "product owner",
            "consultant",
            "business analyst",
            "operations",
            "strategy",
            "program manager",
            "project manager",
            "chef de produit",
            "productmanager",
        ),
    ),
    (
        "eng",
        (
            "engineer",
            "developer",
            "software",
            "backend",
            "frontend",
            "fullstack",
            "full-stack",
            "devops",
            "sre",
            "programmer",
            "développeur",
            "developpeur",
            "ontwikkelaar",
            "ingénieur",
            "ingenieur",
        ),
    ),
)

_TITLE_FR_NL: dict[str, tuple[str, ...]] = {
    "software engineer": ("ingénieur logiciel", "software ontwikkelaar", "développeur"),
    "backend engineer": ("ingénieur backend", "backend ontwikkelaar"),
    "frontend engineer": ("ingénieur frontend", "frontend ontwikkelaar"),
    "data scientist": ("data scientist", "data-analist", "scientifique des données"),
    "data engineer": ("ingénieur data", "data-engineer"),
    "product manager": ("chef de produit", "productmanager", "product owner"),
    "account executive": ("commercial", "accountmanager", "business developer"),
    "firmware engineer": ("ingénieur firmware", "firmware-ingenieur", "embedded engineer"),
    "embedded engineer": ("ingénieur embarqué", "embedded software engineer"),
}

_FAMILY_EXTRA: dict[RoleFamily, tuple[str, ...]] = {
    "eng": ("engineer careers", "software jobs"),
    "data": ("data jobs", "machine learning careers"),
    "embedded": ("embedded firmware jobs", "electronics careers"),
    "business": ("business jobs", "product careers"),
    "sales": ("sales jobs", "account executive careers"),
    "general": ("jobs", "careers"),
}


def infer_role_family(title: str, skills: list[str] | None = None) -> RoleFamily:
    blob = f"{title or ''} {' '.join(skills or [])}".lower()
    if not blob.strip():
        return "general"
    for family, keywords in _FAMILY_KEYWORDS:
        if any(k in blob for k in keywords):
            return family
    return "general"


def _title_variants(title: str, family: RoleFamily) -> list[str]:
    base = (title or "").strip()
    out: list[str] = []
    if base:
        out.append(base)
    key = base.lower()
    for mapped, variants in _TITLE_FR_NL.items():
        if key == mapped or mapped in key:
            out.extend(variants)
            break
    extras = _FAMILY_EXTRA.get(family) or ()
    if base:
        for extra in extras[:1]:
            out.append(f"{base} {extra}")
    # de-dupe
    seen: set[str] = set()
    unique: list[str] = []
    for item in out:
        k = item.strip().lower()
        if not k or k in seen:
            continue
        seen.add(k)
        unique.append(item.strip())
    return unique[:4]


_LOCATION_QUERY_PRIORITY = (
    "belgium",
    "belgique",
    "belgië",
    "brussels",
    "bruxelles",
    "brussel",
    "ghent",
    "gent",
    "antwerp",
    "antwerpen",
    "netherlands",
    "nederland",
    "amsterdam",
    "luxembourg",
    "france",
    "paris",
    "germany",
    "berlin",
    "united kingdom",
    "london",
    "ireland",
    "dublin",
)


def _location_variants(location: str) -> list[str]:
    aliases = expand_location_aliases(location)
    loc = (location or "").strip()
    preferred: list[str] = []
    if loc:
        preferred.append(loc)
    priority = {name: i for i, name in enumerate(_LOCATION_QUERY_PRIORITY)}
    ranked = sorted(
        aliases,
        key=lambda alias: (priority.get(alias.lower(), 100 + len(alias)), alias.lower()),
    )
    for alias in ranked:
        if alias.lower() not in {p.lower() for p in preferred}:
            preferred.append(alias)
        if len(preferred) >= 5:
            break
    return preferred


def _places_from_profile(location: str | None, countries: list[str]) -> list[str]:
    """Location query terms from free-text AND any ISO codes on the profile.

    Discovery must follow the user's countries (SE, AR, …), not a Belgium-only
    default. Explicit ISO codes use ``country_query_names`` (en/fr/nl).
    """
    preferred: list[str] = []
    seen: set[str] = set()

    def _add(value: str) -> None:
        text = (value or "").strip()
        key = text.lower()
        if not text or key in seen:
            return
        seen.add(key)
        preferred.append(text)

    if location and location.strip():
        for item in _location_variants(location):
            _add(item)
    for code in countries:
        if not code or len(str(code).strip()) != 2:
            continue
        names = country_query_names(str(code).upper())
        if names:
            _add(names[0])
    # Second-pass local-language names once each ISO has an English query term.
    for code in countries:
        if not code or len(str(code).strip()) != 2:
            continue
        for name in country_query_names(str(code).upper())[1:]:
            _add(name)
            if len(preferred) >= 6:
                return preferred
    return preferred


def build_demand_packs(
    *,
    title: str,
    location: str | None = None,
    skills: list[str] | None = None,
    max_queries: int = 12,
    places: list[str] | None = None,
) -> list[str]:
    """Tavily queries for this user's title + location (+ FR/NL) + ATS hosts.

    Packs differ by role family inferred from title+skills. No company names.
    ``places`` overrides location expansion so profile ISO countries (any code)
    drive ``site:`` queries instead of a Belgium-only default.
    """
    title = (title or "").strip()
    location = (location or "").strip()
    resolved_places = [p.strip() for p in (places or []) if (p or "").strip()]
    if not resolved_places:
        resolved_places = _location_variants(location) or [""]
    if not title and not location and not any(resolved_places):
        return []

    family = infer_role_family(title, skills)
    titles = _title_variants(title, family) or [title or "jobs"]
    place_terms = resolved_places or [""]
    hosts = list(discovery_hosts())

    queries: list[str] = []
    seen: set[str] = set()

    def _add(q: str) -> None:
        text = " ".join(q.split()).strip()
        key = text.lower()
        if not text or key in seen:
            return
        seen.add(key)
        queries.append(text)

    # Hosts outer-most would starve ATS #5/#6. Round-robin hosts so every
    # registered career site appears before we fill remaining slots.
    for t in titles[:2]:
        for place in place_terms[:2]:
            for host in hosts:
                if t and place:
                    _add(f"{t} {place} jobs site:{host}")
                elif t:
                    _add(f"{t} jobs site:{host}")
                elif place:
                    _add(f"{place} careers site:{host}")
                if len(queries) >= max_queries:
                    return queries

    # Family-specific extra without repeating a company list.
    extra_bits = _FAMILY_EXTRA.get(family, ())
    place0 = place_terms[0] if place_terms else ""
    host0 = hosts[0] if hosts else ""
    for bit in extra_bits[:2]:
        if not host0:
            break
        if title and place0:
            _add(f"{title} {bit} {place0} site:{host0}")
        elif title:
            _add(f"{title} {bit} site:{host0}")

    return queries[:max_queries]


def demand_packs_from_profile(
    prefs: dict[str, Any] | None,
    cv_structured: dict[str, Any] | None = None,
    *,
    max_queries: int = 12,
) -> list[str]:
    prefs = prefs or {}
    cv = cv_structured or {}
    title = (prefs.get("job_title") or "").strip()
    if not title:
        title = str(cv.get("title") or cv.get("headline") or "").strip()
    skills = cv.get("skills") if isinstance(cv.get("skills"), list) else []
    skills_s = [str(s) for s in skills if s]
    location = (prefs.get("location") or "").strip() or str(cv.get("location") or "").strip()
    countries = [str(c).upper() for c in (prefs.get("countries") or []) if c]
    if not countries:
        countries = countries_from_text(location)
    places = _places_from_profile(location, countries)
    roles = [str(r).strip() for r in (prefs.get("preferred_roles") or []) if str(r).strip()]
    titles = [t for t in ([title] + roles) if t]
    seen_titles: set[str] = set()
    unique_titles: list[str] = []
    for item in titles:
        key = item.lower()
        if key in seen_titles:
            continue
        seen_titles.add(key)
        unique_titles.append(item)
    if not unique_titles:
        unique_titles = [title] if title else (["jobs"] if places else [])

    queries: list[str] = []
    per = max(4, max_queries // max(len(unique_titles), 1))
    for role_title in unique_titles[:4]:
        queries.extend(
            build_demand_packs(
                title=role_title,
                location=location,
                places=places,
                skills=skills_s,
                max_queries=per,
            )
        )
        if len(queries) >= max_queries:
            break
    # de-dupe preserving order
    out: list[str] = []
    seen_q: set[str] = set()
    for q in queries:
        key = q.lower()
        if key in seen_q:
            continue
        seen_q.add(key)
        out.append(q)
    return out[:max_queries]
