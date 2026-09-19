"""Cut 2 URL seed — extract slug, upsert company, enqueue sync."""

from app.workers.seed import seed_company_from_url
from app.workers.settings import job_seed_url


class _FakeRepo:
    def __init__(self, companies: list[dict] | None = None):
        self.companies: list[dict] = list(companies or [])

    async def get_company_by_board(self, ats_provider, board_token):
        for row in self.companies:
            if row.get("ats_provider") == ats_provider and (
                row.get("board_token") or ""
            ).lower() == (board_token or "").lower():
                return row
        return None

    async def upsert_company(self, **payload):
        existing = await self.get_company_by_board(
            payload["ats_provider"], payload["board_token"]
        )
        if existing:
            existing.update(payload)
            return existing
        row = {
            "id": f"co-{payload['ats_provider']}-{payload['board_token']}",
            "is_active": payload.get("is_active", True),
            **payload,
        }
        self.companies.append(row)
        return row


async def test_seed_upserts_greenhouse_job_url():
    repo = _FakeRepo()
    result = await seed_company_from_url(
        repo, "https://boards.greenhouse.io/showpad/jobs/12345"
    )
    assert result["ok"] is True
    assert result["provider"] == "greenhouse"
    assert result["slug"] == "showpad"
    assert result["created"] is True
    assert result["company_id"] == "co-greenhouse-showpad"
    assert result["name"] == "Showpad"
    assert len(repo.companies) == 1
    assert repo.companies[0]["board_token"] == "showpad"
    assert repo.companies[0]["careers_url"] == "https://boards.greenhouse.io/showpad"
    assert repo.companies[0]["slug"] != "stripe"  # not a YAML seed fixture


async def test_seed_second_paste_is_idempotent():
    repo = _FakeRepo()
    url = "https://boards.greenhouse.io/showpad/jobs/12345"
    first = await seed_company_from_url(repo, url)
    second = await seed_company_from_url(repo, url)
    assert first["ok"] and second["ok"]
    assert second["created"] is False
    assert second["company_id"] == first["company_id"]
    assert len(repo.companies) == 1


async def test_seed_board_root_and_job_url_share_row():
    repo = _FakeRepo()
    await seed_company_from_url(repo, "https://jobs.lever.co/collibra")
    await seed_company_from_url(
        repo, "https://jobs.lever.co/collibra/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    )
    assert len(repo.companies) == 1
    assert repo.companies[0]["ats_provider"] == "lever"
    assert repo.companies[0]["board_token"] == "collibra"


async def test_seed_rejects_non_ats_without_company():
    repo = _FakeRepo()
    for url in (
        "https://www.linkedin.com/jobs/view/123",
        "https://www.indeed.com/viewjob?jk=abc",
        "https://acme.jobs.personio.de/job/99",
        "https://example.com/careers/backend",
        "",
    ):
        result = await seed_company_from_url(repo, url)
        assert result["ok"] is False
        assert result["reason"] == "not_ats"
    assert repo.companies == []


async def test_job_seed_url_enqueues_sync(monkeypatch):
    repo = _FakeRepo()
    enqueued: list[tuple] = []

    async def _enqueue(name, *args):
        enqueued.append((name, args))
        return "job-sync-1"

    monkeypatch.setattr("app.workers.settings.enqueue_job", _enqueue)
    result = await job_seed_url(
        {"repo": repo},
        "https://jobs.ashbyhq.com/ramp/xyz",
    )
    assert result["ok"] is True
    assert result["sync_enqueued"] is True
    assert result["company_id"] == "co-ashby-ramp"
    syncs = [e for e in enqueued if e[0] == "job_sync_company"]
    assert {e[1][0] for e in syncs} == {result["company_id"]}


async def test_job_seed_url_non_ats_does_not_enqueue(monkeypatch):
    repo = _FakeRepo()
    enqueued: list[tuple] = []

    async def _enqueue(name, *args):
        enqueued.append((name, args))
        return "job-1"

    monkeypatch.setattr("app.workers.settings.enqueue_job", _enqueue)
    result = await job_seed_url({"repo": repo}, "https://www.linkedin.com/jobs/view/1")
    assert result["ok"] is False
    assert enqueued == []
    assert repo.companies == []
