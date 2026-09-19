"""404 / empty boards are capped (deactivated), not retried forever."""

import httpx

from app.workers.sync import sync_company_board


class _FakeRepo:
    def __init__(self):
        self.deactivated: list[tuple[str, str]] = []
        self.empty_counts: list[int] = []
        self.finished: list[dict] = []

    async def start_ingest_run(self, *args, **kwargs):
        return "run-1"

    async def finish_ingest_run(self, run_id, **kwargs):
        self.finished.append(kwargs)

    async def update_company_sync(self, *args, **kwargs):
        return None

    async def record_company_sync_counts(self, company_id, *, consecutive_empty_syncs):
        self.empty_counts.append(consecutive_empty_syncs)

    async def deactivate_company(self, company_id, *, reason):
        self.deactivated.append((company_id, reason))

    async def upsert_jobs(self, *args, **kwargs):
        return [], 0

    async def expire_missing(self, **kwargs):
        return 0


class _EmptyConnector:
    provider = "greenhouse"

    async def fetch_jobs(self, token, *, etag=None):
        return [], None, False


class _NotFoundConnector:
    provider = "greenhouse"

    async def fetch_jobs(self, token, *, etag=None):
        request = httpx.Request("GET", "https://boards-api.greenhouse.io/v1/boards/missing/jobs")
        response = httpx.Response(404, request=request)
        raise httpx.HTTPStatusError("not found", request=request, response=response)


async def test_empty_board_deactivates_after_threshold(monkeypatch):
    repo = _FakeRepo()
    monkeypatch.setattr("app.workers.sync.get_connector", lambda *_: _EmptyConnector())
    monkeypatch.setattr("app.workers.sync.TokenBucket", lambda *a, **k: _ImmediateBucket())
    company = {
        "id": "c1",
        "ats_provider": "greenhouse",
        "board_token": "emptyco",
        "slug": "emptyco",
        "consecutive_empty_syncs": 1,
    }
    result = await sync_company_board(repo, None, company, None)
    assert result["empty"] is True
    assert repo.deactivated == [("c1", "empty_board_x2")]


async def test_http_404_deactivates_immediately(monkeypatch):
    repo = _FakeRepo()
    monkeypatch.setattr("app.workers.sync.get_connector", lambda *_: _NotFoundConnector())
    monkeypatch.setattr("app.workers.sync.TokenBucket", lambda *a, **k: _ImmediateBucket())
    company = {
        "id": "c2",
        "ats_provider": "greenhouse",
        "board_token": "ghost",
        "slug": "ghost",
    }
    result = await sync_company_board(repo, None, company, None)
    assert repo.deactivated == [("c2", "http_404")]
    assert result["errors"]


async def test_http_404_deactivates_teamtailor(monkeypatch):
    repo = _FakeRepo()

    class _NotFoundTeamtailor:
        provider = "teamtailor"

        async def fetch_jobs(self, token, *, etag=None):
            request = httpx.Request("GET", "https://ghost.teamtailor.com/jobs.json")
            response = httpx.Response(404, request=request)
            raise httpx.HTTPStatusError("not found", request=request, response=response)

    monkeypatch.setattr("app.workers.sync.get_connector", lambda *_: _NotFoundTeamtailor())
    monkeypatch.setattr("app.workers.sync.TokenBucket", lambda *a, **k: _ImmediateBucket())
    company = {
        "id": "c-tt",
        "ats_provider": "teamtailor",
        "board_token": "ghost",
        "slug": "ghost",
    }
    result = await sync_company_board(repo, None, company, None)
    assert repo.deactivated == [("c-tt", "http_404")]
    assert result["errors"]
    assert repo.finished[-1]["meta"]["provider"] == "teamtailor"
    assert repo.finished[-1]["meta"]["board_token"] == "ghost"


class _ImmediateBucket:
    async def acquire(self):
        return None
