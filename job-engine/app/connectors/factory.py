"""Connector factory."""

import httpx

from app.connectors.ashby import AshbyConnector
from app.connectors.greenhouse import GreenhouseConnector
from app.connectors.lever import LeverConnector
from app.connectors.workable import WorkableConnector


def get_connector(provider: str, client: httpx.AsyncClient):
    """Return the connector instance for an ATS provider."""
    mapping = {
        "greenhouse": GreenhouseConnector,
        "lever": LeverConnector,
        "ashby": AshbyConnector,
        "workable": WorkableConnector,
    }
    cls = mapping.get(provider)
    if cls is None:
        raise ValueError(f"Unsupported ATS provider: {provider}")
    return cls(client)
