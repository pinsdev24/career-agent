# Job Engine

Catalog + ranking microservice for MACA. This is **not** the apply path.

CareerAgent owns application packets (cover letter + gap report + inbox).
Job Engine owns company board sync, freshness, embeddings, and the ranked feed.

The previous cut was incomplete: no packet loop, no durable applications table, and the frontend only linked out to `/pipeline/new`. This service is the catalog half of the Job OS.

## Stack

- FastAPI (`/v1`) — recommend, search, signals
- ARQ + Redis — ATS board sync, Tavily discovery, freshness, embeddings
- Supabase Postgres + pgvector + `tsvector` — hybrid search
- Official ATS JSON APIs — Greenhouse, Lever, Ashby, Workable

## Quick start

```bash
cp .env.example .env   # fill Supabase / OpenAI / Tavily keys
docker compose up --build
```

- API: http://localhost:8001/docs
- Worker: ARQ cron syncs seeded companies from `companies.seed.yaml`
- Apply migrations: `004_job_engine_catalog.sql` and `005_job_os_applications.sql`

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
