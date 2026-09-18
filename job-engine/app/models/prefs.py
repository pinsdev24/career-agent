"""Structured job-preference domain types (Cut 3)."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class CountryCode(str):
    """ISO 3166-1 alpha-2 country code (uppercase)."""

    __slots__ = ()

    @classmethod
    def parse(cls, value: str | None) -> CountryCode | None:
        raw = (value or "").strip().upper()
        if len(raw) != 2 or not raw.isalpha():
            return None
        return cls(raw)


class WorkMode(str, Enum):
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class ContractType(str, Enum):
    PERMANENT = "permanent"
    FREELANCE = "freelance"
    INTERNSHIP = "internship"
    FIXED_TERM = "fixed_term"


_WORK_MODE_ALIASES: dict[str, WorkMode] = {
    "remote": WorkMode.REMOTE,
    "fully remote": WorkMode.REMOTE,
    "work from home": WorkMode.REMOTE,
    "wfh": WorkMode.REMOTE,
    "teletravail": WorkMode.REMOTE,
    "télétravail": WorkMode.REMOTE,
    "thuiswerk": WorkMode.REMOTE,
    "hybrid": WorkMode.HYBRID,
    "hybride": WorkMode.HYBRID,
    "onsite": WorkMode.ONSITE,
    "on-site": WorkMode.ONSITE,
    "on site": WorkMode.ONSITE,
    "office": WorkMode.ONSITE,
    "in-office": WorkMode.ONSITE,
    "sur site": WorkMode.ONSITE,
    "op kantoor": WorkMode.ONSITE,
}

_CONTRACT_ALIASES: dict[str, ContractType] = {
    "permanent": ContractType.PERMANENT,
    "full-time": ContractType.PERMANENT,
    "full time": ContractType.PERMANENT,
    "fulltime": ContractType.PERMANENT,
    "cdi": ContractType.PERMANENT,
    "vast": ContractType.PERMANENT,
    "employee": ContractType.PERMANENT,
    "freelance": ContractType.FREELANCE,
    "contractor": ContractType.FREELANCE,
    "contract": ContractType.FREELANCE,
    "independent": ContractType.FREELANCE,
    "indépendant": ContractType.FREELANCE,
    "zelfstandige": ContractType.FREELANCE,
    "internship": ContractType.INTERNSHIP,
    "intern": ContractType.INTERNSHIP,
    "stage": ContractType.INTERNSHIP,
    "stagiaire": ContractType.INTERNSHIP,
    "apprenticeship": ContractType.INTERNSHIP,
    "fixed-term": ContractType.FIXED_TERM,
    "fixed term": ContractType.FIXED_TERM,
    "fixed_term": ContractType.FIXED_TERM,
    "cdd": ContractType.FIXED_TERM,
    "temporary": ContractType.FIXED_TERM,
    "temp": ContractType.FIXED_TERM,
    "bepaalde tijd": ContractType.FIXED_TERM,
}


def parse_work_mode(value: str | None) -> WorkMode | None:
    key = (value or "").strip().lower()
    return _WORK_MODE_ALIASES.get(key)


def parse_contract_type(value: str | None) -> ContractType | None:
    key = (value or "").strip().lower()
    if not key:
        return None
    if key in _CONTRACT_ALIASES:
        return _CONTRACT_ALIASES[key]
    for alias, mapped in _CONTRACT_ALIASES.items():
        if alias in key:
            return mapped
    return None


def parse_work_modes(values: Any) -> list[WorkMode]:
    if not values:
        return []
    if isinstance(values, str):
        values = [values]
    out: list[WorkMode] = []
    seen: set[WorkMode] = set()
    for item in values:
        mode = parse_work_mode(str(item)) if not isinstance(item, WorkMode) else item
        if mode and mode not in seen:
            seen.add(mode)
            out.append(mode)
    return out


def parse_contract_types(values: Any) -> list[ContractType]:
    if not values:
        return []
    if isinstance(values, str):
        values = [values]
    out: list[ContractType] = []
    seen: set[ContractType] = set()
    for item in values:
        mapped = (
            item
            if isinstance(item, ContractType)
            else parse_contract_type(str(item))
        )
        if mapped and mapped not in seen:
            seen.add(mapped)
            out.append(mapped)
    return out


class StructuredSearchPrefs(BaseModel):
    """Canonical Cut 3 preference view used by rank/filter/demand."""

    countries: list[str] = Field(default_factory=list)
    cities: list[str] = Field(default_factory=list)
    work_modes: list[WorkMode] = Field(default_factory=list)
    contract_types: list[ContractType] = Field(default_factory=list)
    preferred_roles: list[str] = Field(default_factory=list)
    job_title: str | None = None
    location: str | None = None
    remote_preference: str | None = None
    contract_type: str | None = None

    @field_validator("countries", mode="before")
    @classmethod
    def _countries(cls, value: Any) -> list[str]:
        if not value:
            return []
        if isinstance(value, str):
            value = [value]
        out: list[str] = []
        seen: set[str] = set()
        for item in value:
            code = CountryCode.parse(str(item))
            if code and code not in seen:
                seen.add(code)
                out.append(code)
        return out

    @field_validator("cities", "preferred_roles", mode="before")
    @classmethod
    def _str_list(cls, value: Any) -> list[str]:
        if not value:
            return []
        if isinstance(value, str):
            value = [value]
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

    @field_validator("work_modes", mode="before")
    @classmethod
    def _work_modes(cls, value: Any) -> list[WorkMode]:
        return parse_work_modes(value)

    @field_validator("contract_types", mode="before")
    @classmethod
    def _contract_types(cls, value: Any) -> list[ContractType]:
        return parse_contract_types(value)


def work_modes_to_remote_filter(modes: list[WorkMode] | None) -> bool | None:
    """Map work-mode multi-select to a boolean remote filter.

    hybrid is not stored on postings, so it never hard-excludes on its own.
    """
    if not modes:
        return None
    unique = set(modes)
    if unique == {WorkMode.REMOTE}:
        return True
    if unique == {WorkMode.ONSITE}:
        return False
    if unique == {WorkMode.ONSITE, WorkMode.HYBRID}:
        return False
    if unique == {WorkMode.REMOTE, WorkMode.HYBRID}:
        return None
    return None
