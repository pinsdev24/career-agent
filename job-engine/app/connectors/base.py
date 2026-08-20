"""Connector protocol and shared types."""

from typing import Protocol

from app.models.schemas import CanonicalJob


class BoardConnector(Protocol):
    """Protocol for ATS board sync connectors."""

    provider: str

    async def fetch_jobs(
        self,
        board_token: str,
        *,
        etag: str | None = None,
    ) -> tuple[list[CanonicalJob], str | None, bool]:
        """Fetch jobs for a board.

        Returns (jobs, new_etag, not_modified).
        """
        ...
