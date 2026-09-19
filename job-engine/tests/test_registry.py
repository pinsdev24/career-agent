"""Catalog ATS registry — adding #6 must not require a new extract/factory fork."""

from app.connectors.factory import get_connector, registered_connector_providers
from app.connectors.registry import (
    CATALOG_SPECS,
    catalog_providers,
    discovery_hosts,
    seedable_providers,
    spec_for,
    tavily_include_domains,
)


def test_factory_covers_every_registry_provider():
    assert registered_connector_providers() == seedable_providers()
    assert "teamtailor" in catalog_providers()
    assert spec_for("teamtailor") is not None
    assert spec_for("teamtailor").slug_from == "subdomain"


def test_get_connector_instantiates_teamtailor():
    connector = get_connector("teamtailor", client=None)
    assert connector.provider == "teamtailor"


def test_unknown_provider_raises():
    import pytest

    with pytest.raises(ValueError, match="Unsupported ATS provider"):
        get_connector("personio", client=None)


def test_discovery_hosts_include_teamtailor_not_api():
    hosts = discovery_hosts()
    assert "teamtailor.com" in hosts
    assert "boards.greenhouse.io" in hosts
    assert "job-boards.greenhouse.io" not in hosts
    assert "boards-api.greenhouse.io" not in hosts
    tavily_hosts = tavily_include_domains()
    assert "teamtailor.com" in tavily_hosts
    assert "job-boards.greenhouse.io" in tavily_hosts
    assert "boards-api.greenhouse.io" not in tavily_hosts


def test_each_spec_has_the_shared_contract_fields():
    for spec in CATALOG_SPECS:
        assert spec.provider
        assert spec.discovery_hosts
        assert spec.host_markers
        assert spec.careers_url_template
        assert spec.slug_from in {"path", "subdomain"}
