# Job Engine

Catalog + ranking microservice for **Ariadne**. This is **not** the apply path — Ariadne never auto-applies.

Ariadne owns application packets (cover letter + gap report + inbox).
Job Engine owns company board sync, freshness, embeddings, and the ranked feed.

Discovery is **profile-driven** (target title + location + ATS hosts). `companies.seed.yaml` is a fixture to boot a catalog, not the product strategy.

## Stack

- FastAPI (`/v1`) — recommend, search, signals
- ARQ + Redis — ATS board sync, Tavily discovery, freshness, embeddings
- Supabase Postgres + pgvector + `tsvector` — hybrid search
- Official ATS JSON APIs — Greenhouse, Lever, Ashby, Workable, Teamtailor

Teamtailor boards are ``https://{slug}.teamtailor.com/jobs.json``. URL seed
accepts ``*.teamtailor.com`` job/board URLs. Custom career domains
(``careers.example.com``) often serve the same JSON feed but do **not** encode
the board token — we do not HTML-crawl or CNAME-resolve those hosts. Paste the
``*.teamtailor.com`` URL. Discovery ``site:`` packs include every registered
ATS host and use the user's profile countries (any ISO), not a Belgium-only list.

## Quick start

```bash
cp .env.example .env   # fill Supabase / OpenAI / Tavily keys
docker compose up --build
```

- API: http://localhost:8001/docs
- Worker: ARQ cron syncs seeded companies from `companies.seed.yaml`
- Apply migrations: `004_job_engine_catalog.sql`, `005_job_os_applications.sql`, and `006_job_engine_geo_filters.sql`

```bash
# local without docker (Redis required)
uv sync
uv run uvicorn app.main:app --port 8001 --reload
uv run arq app.workers.settings.WorkerSettings
```

## Tests

```bash
uv sync --group dev
uv run pytest
```

## Admin

```bash
curl -H "X-Admin-Key: $ADMIN_API_KEY" http://localhost:8001/v1/admin/ingest/stats
curl -X POST -H "X-Admin-Key: $ADMIN_API_KEY" http://localhost:8001/v1/admin/ingest/sync
```
