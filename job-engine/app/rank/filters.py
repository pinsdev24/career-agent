"""Hard catalog filters from structured search preferences (Cut 3).

Never silently drop a user filter — empty recall is the honest outcome.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.models.prefs import (
    ContractType,
    StructuredSearchPrefs,
    WorkMode,
    parse_contract_type,
    parse_work_modes,
    work_modes_to_remote_filter,
)
from app.rank.countries import countries_from_text, parse_posting_location, posting_country_code
from app.rank.geo import location_matches, remote_pref_to_filter
from app.workers.demand import infer_role_family


@dataclass
class CatalogFilters:
    countries: list[str] = field(default_factory=list)
    cities: list[str] = field(default_factory=list)
    work_modes: list[WorkMode] = field(default_factory=list)
    contract_types: list[ContractType] = field(default_factory=list)
    roles: list[str] = field(default_factory=list)
    location: str | None = None
    remote: bool | None = None
    contract: str | None = None

    def hard_filters_on(self) -> bool:
        return bool(
            self.countries
            or self.work_modes
            or self.contract_types
            or self.roles
            or (self.location or "").strip()
            or self.remote is not None
            or (self.contract or "").strip()
        )


def _str_list(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, str):
        return [p.strip() for p in value.split(",") if p.strip()]
    out: list[str] = []
    seen: set[str] = set()
    for item in value:
        text = str(item).strip()
        key = text.lower()
        if not text or key in seen:
            continue
        seen.add(key)
        out.append(text)
    return out


def normalize_search_preferences(prefs: dict[str, Any] | None) -> dict[str, Any]:
    """Persist structured codes. Legacy free-text location → countries (best-effort)."""
    raw = dict(prefs or {})
    structured = resolve_structured_prefs(raw)
    raw["countries"] = list(structured.countries)
    raw["cities"] = list(structured.cities)
    raw["work_modes"] = [m.value for m in structured.work_modes]
    raw["contract_types"] = [c.value for c in structured.contract_types]
    raw["preferred_roles"] = list(structured.preferred_roles)
    if structured.job_title:
        raw["job_title"] = structured.job_title
    if structured.location:
        raw["location"] = structured.location
    if structured.remote_preference:
        raw["remote_preference"] = structured.remote_preference
    if structured.contract_type:
        raw["contract_type"] = structured.contract_type
    return raw


def resolve_structured_prefs(prefs: dict[str, Any] | None) -> StructuredSearchPrefs:
    prefs = prefs or {}
    structured = StructuredSearchPrefs.model_validate(
        {
            "countries": prefs.get("countries") or [],
            "cities": prefs.get("cities") or [],
            "work_modes": prefs.get("work_modes") or [],
            "contract_types": prefs.get("contract_types") or [],
            "preferred_roles": prefs.get("preferred_roles") or [],
            "job_title": (prefs.get("job_title") or None),
            "location": (prefs.get("location") or None),
            "remote_preference": (prefs.get("remote_preference") or None),
            "contract_type": (prefs.get("contract_type") or None),
        }
    )
    countries = list(structured.countries)
    if not countries:
        countries = countries_from_text(structured.location)
    work_modes = list(structured.work_modes)
    if not work_modes:
        work_modes = parse_work_modes(structured.remote_preference)
    contract_types = list(structured.contract_types)
    if not contract_types and structured.contract_type:
        mapped = parse_contract_type(structured.contract_type)
        if mapped:
            contract_types = [mapped]
    roles = list(structured.preferred_roles)
    if not roles and (structured.job_title or "").strip():
        roles = [structured.job_title.strip()]
    return StructuredSearchPrefs(
        countries=countries,
        cities=structured.cities,
        work_modes=work_modes,
        contract_types=contract_types,
        preferred_roles=roles,
        job_title=structured.job_title,
        location=structured.location,
        remote_preference=structured.remote_preference,
        contract_type=structured.contract_type,
    )


def filters_from_prefs(
    prefs: dict[str, Any] | None,
    *,
    override_countries: list[str] | None = None,
    override_work_modes: list[str] | None = None,
    override_contract_types: list[str] | None = None,
    override_roles: list[str] | None = None,
    override_location: str | None = None,
    override_remote: bool | None = None,
) -> CatalogFilters:
    structured = resolve_structured_prefs(prefs)
    countries = list(structured.countries)
    # None = caller omitted the dimension (use profile). [] = explicit clear
    # (all countries / any mode) — do not fall back to profile hard gates.
    if override_countries is not None:
        countries = [c.upper() for c in override_countries if len(c.strip()) == 2]
    location = structured.location
    if override_location is not None:
        location = override_location.strip() or None
        if override_countries is None and not countries:
            countries = countries_from_text(location)
    if override_countries is not None and not countries:
        # UI "Tous les pays" / empty countries pref: unknown geo is not a miss.
        location = None

    work_modes = list(structured.work_modes)
    if override_work_modes is not None:
        work_modes = parse_work_modes(override_work_modes)

    contract_types = list(structured.contract_types)
    if override_contract_types is not None:
        from app.models.prefs import parse_contract_types

        contract_types = parse_contract_types(override_contract_types)

    roles = list(structured.preferred_roles)
    if override_roles is not None:
        roles = _str_list(override_roles)

    remote = work_modes_to_remote_filter(work_modes)
    if override_remote is not None:
        remote = override_remote
    elif override_work_modes is None and remote is None:
        remote = remote_pref_to_filter(structured.remote_preference)

    contract = structured.contract_type
    if override_contract_types is not None and not contract_types:
        contract = None
    return CatalogFilters(
        countries=countries,
        cities=list(structured.cities),
        work_modes=work_modes,
        contract_types=contract_types,
        roles=roles,
        location=location,
        remote=remote,
        contract=contract,
    )


_SALES_ADJACENT = frozenset({"sales"})
_TECH_FAMILIES = frozenset({"eng", "data", "embedded"})


def _role_blob_family(role: str) -> str:
    text = (role or "").strip().lower()
    if any(k in text for k in ("ai", "ml", "machine learning", "llm", "data sci", "nlp")):
        if "sales" not in text:
            return "data"
    if text in {"eng", "engineering", "engineer", "ingénieur", "ingenieur"}:
        return "eng"
    return infer_role_family(role, None)


def preferred_role_gate(job_title: str | None, preferred_roles: list[str] | None) -> bool:
    """Hard-exclude Sales/ER when the user asked for eng/AI (and similar).

    Unknown / general titles pass. Matching families pass. Clear family mismatch
    against a technical pref is a hard miss — that's what kept Sales off an
    Ingénieur IA feed.
    """
    roles = [r for r in (preferred_roles or []) if (r or "").strip()]
    if not roles:
        return True
    title = (job_title or "").strip()
    if not title:
        return True
    title_l = title.lower()
    for role in roles:
        role_l = role.lower()
        if role_l in title_l or title_l in role_l:
            return True

    job_family = _role_blob_family(title)
    pref_families = {_role_blob_family(r) for r in roles}
    if job_family in pref_families:
        return True
    if job_family == "general":
        return True
    if pref_families & _TECH_FAMILIES and job_family in _SALES_ADJACENT:
        return False
    if pref_families & _TECH_FAMILIES and job_family == "business":
        return False
    return True


def preferred_role_score(job_title: str | None, preferred_roles: list[str] | None) -> float:
    """0..1 soft boost when the title hits a preferred role / family."""
    roles = [r for r in (preferred_roles or []) if (r or "").strip()]
    if not roles:
        return 0.0
    title = (job_title or "").strip()
    if not title:
        return 0.0
    title_l = title.lower()
    for role in roles:
        role_l = role.lower()
        if role_l and (role_l in title_l or title_l in role_l):
            return 1.0
    job_family = _role_blob_family(title)
    pref_families = {_role_blob_family(r) for r in roles}
    if job_family != "general" and job_family in pref_families:
        return 0.7
    return 0.0


def _city_matches(job_city: str | None, job_location: str | None, pref_cities: list[str]) -> bool:
    if not pref_cities:
        return False
    blob = f"{job_city or ''} {job_location or ''}".lower()
    for city in pref_cities:
        needle = city.strip().lower()
        if needle and needle in blob:
            return True
    return False


def _contract_matches(row: dict, types: list[ContractType], legacy: str | None) -> bool:
    raw = row.get("contract_type")
    if not raw:
        # PRD: filter only when the posting has a type.
        return True
    parsed = parse_contract_type(str(raw))
    if types:
        if parsed is None:
            return True
        return parsed in types
    if legacy:
        return legacy.lower() in str(raw).lower()
    return True


def _work_mode_matches(row: dict, modes: list[WorkMode], remote: bool | None) -> bool:
    if modes:
        job_remote = row.get("remote")
        unique = set(modes)
        if unique == {WorkMode.REMOTE}:
            return job_remote is True
        if unique == {WorkMode.ONSITE}:
            return job_remote is not True
        if unique == {WorkMode.ONSITE, WorkMode.HYBRID}:
            return job_remote is not True
        if unique == {WorkMode.REMOTE, WorkMode.HYBRID}:
            return job_remote is not False
        return True
    if remote is True and row.get("remote") is not True:
        return False
    if remote is False and row.get("remote") is True:
        return False
    return True


def row_matches_structured(row: dict, filters: CatalogFilters) -> bool:
    """Honest post-filter. Country codes win over legacy location ILIKE."""
    if not _work_mode_matches(row, filters.work_modes, filters.remote):
        return False

    if filters.countries:
        # Stored NULL is unknown, not a miss, until location text resolves a
        # code. Unresolvable unknown is excluded only when a country gate is on.
        code = posting_country_code(row)
        if code is None:
            return False
        if code not in {c.upper() for c in filters.countries}:
            return False
    elif filters.location and not location_matches(row.get("location"), filters.location):
        return False

    if not _contract_matches(row, filters.contract_types, filters.contract):
        return False

    if filters.roles and not preferred_role_gate(row.get("title"), filters.roles):
        return False

    return True


def posting_geo_fields(location: str | None) -> tuple[str | None, str | None]:
    parsed = parse_posting_location(location)
    return parsed.country_code, parsed.city
