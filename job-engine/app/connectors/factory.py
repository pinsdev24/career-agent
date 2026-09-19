"""Connector factory — class map for registry providers."""

import httpx

from app.connectors.ashby import AshbyConnector
from app.connectors.greenhouse import GreenhouseConnector
from app.connectors.lever import LeverConnector
from app.connectors.registry import spec_for
from app.connectors.teamtailor import TeamtailorConnector
from app.connectors.workable import WorkableConnector

_CONNECTORS = {
    "greenhouse": GreenhouseConnector,
    "lever": LeverConnector,
    "ashby": AshbyConnector,
    "workable": WorkableConnector,
    "teamtailor": TeamtailorConnector,
}


def get_connector(provider: str, client: httpx.AsyncClient):
    """Return the connector instance for a catalog ATS provider."""
    key = (provider or "").strip().lower()
    cls = _CONNECTORS.get(key)
    if cls is None or spec_for(key) is None:
        raise ValueError(f"Unsupported ATS provider: {provider}")
    return cls(client)


def registered_connector_providers() -> frozenset[str]:
    """Providers the factory can instantiate (must match the registry)."""
    return frozenset(_CONNECTORS)
