"""Recall must not silently drop location/remote filters."""

from app.db.repository import row_matches_filters
from app.rank.scorer import SearchIndex


class _FakeRepo:
    def __init__(self, rows: list[dict]):
        self.rows = rows
        self.calls: list[dict] = []

    async def search_lexical(self, query, **filters):
        self.calls.append({"op": "lexical", "query": query, **filters})
        return self._apply(filters)

    async def list_recent_active(self, **filters):
        self.calls.append({"op": "recent", **filters})
        return self._apply(filters)

    async def hybrid_search_rpc(self, *args, **filters):
        return []

    async def match_job_postings_rpc(self, *args, **filters):
        return []

    def _apply(self, filters: dict) -> list[dict]:
        return [
            row
            for row in self.rows
            if row_matches_filters(
                row,
                filter_remote=filters.get("filter_remote"),
                filter_location=filters.get("filter_location"),
                filter_contract=filters.get("filter_contract"),
            )
        ]


NYC = {
    "id": "nyc-1",
    "title": "Software Engineer",
    "company_name": "Stripe",
    "location": "New York, NY",
    "remote": True,
    "status": "active",
    "description_text": "Build payments in NYC",
}

AR_REMOTE = {
    "id": "ar-1",
    "title": "AI Engineer",
    "company_name": "Domino",
    "location": "Remote Argentina",
    "remote": True,
    "status": "active",
    "description_text": "Remote.com Argentina hub",
}

BRU = {
    "id": "bru-1",
    "title": "Software Engineer",
    "company_name": "LocalCo",
    "location": "Bruxelles, Belgique",
    "remote": False,
    "status": "active",
    "description_text": "Onsite Brussels",
}


async def test_belgium_onsite_does_not_dump_nyc_majority():
    repo = _FakeRepo([NYC, {**NYC, "id": "nyc-2"}, {**NYC, "id": "airbnb"}])
    recalled = await SearchIndex(repo).recall(
        query_text="Firmware Engineer",
        embedding=None,
        filter_remote=False,
        filter_location="Belgium",
        filter_contract=None,
        limit=80,
    )
    assert recalled == []
    assert repo.calls
    assert all(c.get("filter_location") == "Belgium" for c in repo.calls)
    assert all(c.get("op") != "recent" or c.get("filter_location") == "Belgium" for c in repo.calls)


async def test_belgium_aliases_can_recall_brussels():
    repo = _FakeRepo([NYC, BRU])
    recalled = await SearchIndex(repo).recall(
        query_text="Software Engineer",
        embedding=None,
        filter_remote=False,
        filter_location="Belgium",
        filter_contract=None,
    )
    ids = {r["job_id"] for r in recalled}
    assert "bru-1" in ids
    assert "nyc-1" not in ids


async def test_belgium_pref_does_not_recall_argentina_via_gent_substring():
    repo = _FakeRepo([AR_REMOTE, BRU])
    recalled = await SearchIndex(repo).recall(
        query_text="Ingénieur IA",
        embedding=None,
        filter_remote=None,
        filter_location="Belgique",
        filter_contract=None,
    )
    ids = {r["job_id"] for r in recalled}
    assert "bru-1" in ids
    assert "ar-1" not in ids
