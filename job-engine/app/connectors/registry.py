"""Catalog ATS registry — the contract for adding the next board connector.

Adding ATS #6 should mean: one ``AtsSpec`` here, one connector module that
implements ``BoardConnector.fetch_jobs``, fixture tests, and a DB check
constraint update. Shared runtime already covers:

- ``GET`` JSON via ``http.get_json`` (retries on 429/5xx)
- normalize through ``build_canonical_job``
- 404/410/422 → deactivate in ``sync_company_board``
- empty ``items``/jobs → consecutive-empty cap then deactivate
- Redis ``TokenBucket`` keyed by ``provider`` (optional per-spec rate)

URL seed and Tavily discovery read host allowlists from this module so slug
extract stays in one place.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

SlugFrom = Literal["path", "subdomain"]


@dataclass(frozen=True)
class AtsSpec:
    """One catalog ATS. Keep fields boring so #6 is a copy-paste, not a redesign."""

    provider: str
    display_name: str
    # Career-site hosts used by Tavily ``include_domains`` / ``site:`` queries.
    discovery_hosts: tuple[str, ...]
    # Extra hosts accepted by URL seed / ``is_ats_host`` (APIs, aliases).
    extra_allowlist_hosts: tuple[str, ...] = ()
    # Substrings matched against the URL host when extracting a board slug.
    host_markers: tuple[str, ...] = ()
    slug_from: SlugFrom = "path"
    careers_url_template: str = ""
    source_trust: float = 1.0
    # None → ``Settings.ats_rate_limit_per_second``.
    rate_per_second: float | None = None
    # Greenhouse embed boards: ``?for=slug``.
    embed_for_param: bool = False
    # Labels that are not a company board on subdomain ATS hosts.
    reserved_subdomains: frozenset[str] = frozenset()


# Reserved on ``*.teamtailor.com`` — never treat these as a board_token.
TEAMTAILOR_RESERVED_SUBDOMAINS = frozenset(
    {
        "www",
        "app",
        "api",
        "jobs",
        "career",
        "careers",
        "support",
        "help",
        "blog",
        "mail",
        "email",
        "status",
        "assets",
        "cdn",
        "login",
        "admin",
        "signup",
        "go",
        "embed",
    }
)


CATALOG_SPECS: tuple[AtsSpec, ...] = (
    AtsSpec(
        provider="greenhouse",
        display_name="Greenhouse",
        discovery_hosts=("boards.greenhouse.io", "job-boards.greenhouse.io"),
        extra_allowlist_hosts=("boards-api.greenhouse.io",),
        host_markers=("greenhouse.io",),
        slug_from="path",
        careers_url_template="https://boards.greenhouse.io/{slug}",
        embed_for_param=True,
    ),
    AtsSpec(
        provider="lever",
        display_name="Lever",
        discovery_hosts=("jobs.lever.co",),
        extra_allowlist_hosts=("api.lever.co",),
        host_markers=("lever.co",),
        slug_from="path",
        careers_url_template="https://jobs.lever.co/{slug}",
    ),
    AtsSpec(
        provider="ashby",
        display_name="Ashby",
        discovery_hosts=("jobs.ashbyhq.com",),
        extra_allowlist_hosts=("api.ashbyhq.com",),
        host_markers=("ashbyhq.com",),
        slug_from="path",
        careers_url_template="https://jobs.ashbyhq.com/{slug}",
    ),
    AtsSpec(
        provider="workable",
        display_name="Workable",
        discovery_hosts=("apply.workable.com",),
        extra_allowlist_hosts=("jobs.workable.com",),
        host_markers=("workable.com",),
        slug_from="path",
        careers_url_template="https://apply.workable.com/{slug}",
    ),
    AtsSpec(
        provider="teamtailor",
        display_name="Teamtailor",
        discovery_hosts=("teamtailor.com",),
        host_markers=("teamtailor.com",),
        slug_from="subdomain",
        careers_url_template="https://{slug}.teamtailor.com",
        source_trust=0.95,
        # Full-board JSON dump — stay well under the shared 2 rps default.
        rate_per_second=1.0,
        reserved_subdomains=TEAMTAILOR_RESERVED_SUBDOMAINS,
    ),
)


def spec_for(provider: str) -> AtsSpec | None:
    key = (provider or "").strip().lower()
    for spec in CATALOG_SPECS:
        if spec.provider == key:
            return spec
    return None


def seedable_providers() -> frozenset[str]:
    return frozenset(spec.provider for spec in CATALOG_SPECS)


def catalog_providers() -> tuple[str, ...]:
    return tuple(spec.provider for spec in CATALOG_SPECS)


def discovery_hosts() -> tuple[str, ...]:
    """One ``site:`` host per provider so demand packs don't starve ATS #5/#6."""
    return tuple(spec.discovery_hosts[0] for spec in CATALOG_SPECS if spec.discovery_hosts)


def tavily_include_domains() -> list[str]:
    """All career-site hosts (aliases included). Skip API hostnames."""
    hosts: list[str] = []
    seen: set[str] = set()
    for spec in CATALOG_SPECS:
        for host in spec.discovery_hosts:
            if host not in seen:
                seen.add(host)
                hosts.append(host)
    return hosts


def allowlist_hosts() -> tuple[str, ...]:
    hosts: list[str] = []
    seen: set[str] = set()
    for spec in CATALOG_SPECS:
        for host in (*spec.discovery_hosts, *spec.extra_allowlist_hosts):
            if host not in seen:
                seen.add(host)
                hosts.append(host)
    return tuple(hosts)


def source_trust_map() -> dict[str, float]:
    return {spec.provider: spec.source_trust for spec in CATALOG_SPECS}


def ats_careers_url(provider: str, slug: str) -> str:
    spec = spec_for(provider)
    if not spec or not spec.careers_url_template:
        return ""
    return spec.careers_url_template.format(slug=slug)


def rate_limit_for(provider: str) -> float | None:
    spec = spec_for(provider)
    return spec.rate_per_second if spec else None
