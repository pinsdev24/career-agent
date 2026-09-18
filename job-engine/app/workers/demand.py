"""Profile-driven Tavily demand packs — title + location + ATS hosts, no company list."""

from __future__ import annotations

from typing import Any

from app.rank.geo import expand_location_aliases

# Public ATS hosts we already know how to sync (not Personio / new adapters).
_DISCOVERY_HOSTS = (
    "boards.greenhouse.io",
    "jobs.lever.co",
    "jobs.ashbyhq.com",
    "apply.workable.com",
)

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


def build_demand_packs(
    *,
    title: str,
    location: str | None = None,
    skills: list[str] | None = None,
    max_queries: int = 12,
) -> list[str]:
    """Tavily queries for this user's title + location (+ FR/NL) + ATS hosts.

    Packs differ by role family inferred from title+skills. No company names.
    """
    title = (title or "").strip()
    location = (location or "").strip()
    if not title and not location:
        return []

    family = infer_role_family(title, skills)
    titles = _title_variants(title, family) or [title or "jobs"]
    places = _location_variants(location) or [""]
    hosts = list(_DISCOVERY_HOSTS)

    queries: list[str] = []
    seen: set[str] = set()

    def _add(q: str) -> None:
        text = " ".join(q.split()).strip()
        key = text.lower()
        if not text or key in seen:
            return
        seen.add(key)
        queries.append(text)

    for host in hosts:
        for t in titles[:3]:
            for place in places[:3]:
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
    place0 = places[0] if places else ""
    for bit in extra_bits[:2]:
        if title and place0:
            _add(f"{title} {bit} {place0} site:{hosts[0]}")
        elif title:
            _add(f"{title} {bit} site:{hosts[0]}")

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
    return build_demand_packs(
        title=title,
        location=location,
        skills=skills_s,
        max_queries=max_queries,
    )
