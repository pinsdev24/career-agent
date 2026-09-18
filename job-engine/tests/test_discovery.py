"""Discovery upserts new boards and reports ids for immediate sync enqueue."""

from app.workers.discovery import discover_via_tavily


class _FakeRepo:
    def __init__(self):
        self.companies: list[dict] = [
            {
                "id": "seed-stripe",
                "ats_provider": "greenhouse",
                "board_token": "stripe",
                "is_active": True,
            }
        ]
        self.intents: list[dict] = []
        self.runs: list[dict] = []

    async def start_ingest_run(self, source, company_slug=None):
        return "run-1"

    async def finish_ingest_run(self, run_id, **kwargs):
        self.runs.append(kwargs)

    async def list_companies(self, *, active_only=False):
        return list(self.companies)

    async def count_active_companies(self):
        return sum(1 for c in self.companies if c.get("is_active"))

    async def list_discovery_intents(self, limit=40):
        return list(self.intents)

    async def upsert_company(self, **payload):
        row = {
            "id": f"new-{payload['board_token']}",
            "is_active": True,
            **payload,
        }
        self.companies.append(row)
        return row


class _FakeTavily:
    async def discover_boards(self, query: str):
        if "belgium" in query.lower() or "bruxelles" in query.lower():
            return [("greenhouse", "showpad"), ("lever", "collibra")]
        return [("greenhouse", "stripe")]


async def test_discovery_upserts_non_seed_boards(monkeypatch):
    repo = _FakeRepo()
    monkeypatch.setattr(
        "app.workers.discovery.TavilyDiscovery", lambda: _FakeTavily()
    )
    result = await discover_via_tavily(
        repo,
        queries=["Firmware Engineer Belgium jobs site:boards.greenhouse.io"],
    )
    assert "new-showpad" in result["company_ids"]
    slugs = {c.get("board_token") or c.get("slug") for c in repo.companies}
    assert "showpad" in slugs
    assert "stripe" in slugs  # seed fixture stays; new rows appear beside it


async def test_discovery_without_packs_is_a_no_op(monkeypatch):
    repo = _FakeRepo()
    monkeypatch.setattr(
        "app.workers.discovery.TavilyDiscovery", lambda: _FakeTavily()
    )
    result = await discover_via_tavily(repo, queries=[])
    assert result["boards"] == 0
    assert result.get("reason") == "no_demand_packs"


async def test_discover_worker_enqueues_sync_immediately(monkeypatch):
    from app.workers.settings import job_discover_tavily

    repo = _FakeRepo()
    enqueued: list[tuple] = []

    async def _enqueue(name, *args):
        enqueued.append((name, args))
        return "job-1"

    monkeypatch.setattr(
        "app.workers.discovery.TavilyDiscovery", lambda: _FakeTavily()
    )
    monkeypatch.setattr("app.workers.settings.enqueue_job", _enqueue)
    result = await job_discover_tavily(
        {"repo": repo},
        ["Firmware Engineer Belgium jobs site:boards.greenhouse.io"],
    )
    assert result["company_ids"]
    syncs = [e for e in enqueued if e[0] == "job_sync_company"]
    assert {e[1][0] for e in syncs} == set(result["company_ids"])
