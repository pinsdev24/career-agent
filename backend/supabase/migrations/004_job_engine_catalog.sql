-- Job Engine catalog schema
-- Companies, postings, embeddings, signals, ingest runs + hybrid search RPCs

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- companies
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            text NOT NULL UNIQUE,
    name            text NOT NULL,
    ats_provider    text NOT NULL CHECK (ats_provider IN (
                        'greenhouse', 'lever', 'ashby', 'workable', 'unknown'
                    )),
    board_token     text NOT NULL,
    careers_url     text,
    etag            text,
    synced_at       timestamptz,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (ats_provider, board_token)
);

CREATE INDEX IF NOT EXISTS idx_companies_active
    ON companies (is_active) WHERE is_active = true;

-- ============================================================
-- job_postings
-- ============================================================

CREATE TABLE IF NOT EXISTS job_postings (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source              text NOT NULL,
    external_id         text NOT NULL,
    company_id          uuid REFERENCES companies(id) ON DELETE SET NULL,
    company_slug        text,
    company_name        text NOT NULL,
    title               text NOT NULL,
    location            text,
    remote              boolean,
    contract_type       text,
    salary              text,
    description_text    text NOT NULL DEFAULT '',
    apply_url           text NOT NULL,
    skills              jsonb NOT NULL DEFAULT '[]'::jsonb,
    status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'expired', 'removed', 'unknown')),
    posted_at           timestamptz,
    last_seen_at        timestamptz NOT NULL DEFAULT now(),
    content_hash        text,
    fingerprint         text,
    embed_pending       boolean NOT NULL DEFAULT true,
    raw                 jsonb NOT NULL DEFAULT '{}'::jsonb,
    search_tsv          tsvector GENERATED ALWAYS AS (
                            to_tsvector(
                                'english',
                                coalesce(title, '') || ' ' ||
                                coalesce(company_name, '') || ' ' ||
                                coalesce(location, '') || ' ' ||
                                coalesce(description_text, '')
                            )
                        ) STORED,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_job_postings_status_posted
    ON job_postings (status, posted_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_job_postings_search_tsv
    ON job_postings USING gin (search_tsv);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_postings_active_apply_url
    ON job_postings (apply_url)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_job_postings_embed_pending
    ON job_postings (embed_pending)
    WHERE embed_pending = true AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_job_postings_fingerprint
    ON job_postings (fingerprint);

CREATE INDEX IF NOT EXISTS idx_job_postings_last_seen
    ON job_postings (last_seen_at)
    WHERE status = 'active';

-- ============================================================
-- job_posting_embeddings
-- ============================================================

CREATE TABLE IF NOT EXISTS job_posting_embeddings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id      uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    chunk_text  text NOT NULL,
    chunk_type  text NOT NULL DEFAULT 'full',
    embedding   vector(1536) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_posting_embeddings_hnsw
    ON job_posting_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_job_posting_embeddings_job
    ON job_posting_embeddings (job_id);

-- ============================================================
-- job_ingest_runs
-- ============================================================

CREATE TABLE IF NOT EXISTS job_ingest_runs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source          text NOT NULL,
    company_slug    text,
    started_at      timestamptz NOT NULL DEFAULT now(),
    finished_at     timestamptz,
    upserted        int NOT NULL DEFAULT 0,
    expired         int NOT NULL DEFAULT 0,
    skipped         int NOT NULL DEFAULT 0,
    errors          jsonb NOT NULL DEFAULT '[]'::jsonb,
    meta            jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_job_ingest_runs_started
    ON job_ingest_runs (started_at DESC);

-- ============================================================
-- user_job_signals
-- ============================================================

CREATE TABLE IF NOT EXISTS user_job_signals (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id      uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    signal      text NOT NULL CHECK (signal IN ('save', 'dismiss', 'apply', 'impression')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, job_id, signal)
);

ALTER TABLE user_job_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own job signals"
    ON user_job_signals FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on user_job_signals"
    ON user_job_signals FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- saved_searches (alerts later)
-- ============================================================

CREATE TABLE IF NOT EXISTS saved_searches (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name        text NOT NULL,
    query       jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved searches"
    ON saved_searches FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on saved_searches"
    ON saved_searches FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- RPCs: ANN + hybrid search
-- ============================================================

CREATE OR REPLACE FUNCTION match_job_postings(
    query_embedding vector(1536),
    match_count int DEFAULT 50,
    match_threshold float DEFAULT 0.2,
    filter_remote boolean DEFAULT NULL,
    filter_location text DEFAULT NULL,
    filter_contract text DEFAULT NULL
)
RETURNS TABLE (
    job_id uuid,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        e.job_id,
        MAX(1 - (e.embedding <=> query_embedding))::float AS similarity
    FROM job_posting_embeddings e
    JOIN job_postings j ON j.id = e.job_id
    WHERE j.status = 'active'
      AND (filter_remote IS NULL OR j.remote = filter_remote)
      AND (
            filter_location IS NULL
            OR j.location ILIKE '%' || filter_location || '%'
          )
      AND (
            filter_contract IS NULL
            OR j.contract_type ILIKE '%' || filter_contract || '%'
          )
      AND 1 - (e.embedding <=> query_embedding) > match_threshold
    GROUP BY e.job_id
    ORDER BY MAX(e.embedding <=> query_embedding)
    LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION search_job_postings_hybrid(
    query_text text,
    query_embedding vector(1536),
    match_count int DEFAULT 50,
    filter_remote boolean DEFAULT NULL,
    filter_location text DEFAULT NULL,
    filter_contract text DEFAULT NULL,
    semantic_weight float DEFAULT 0.6,
    lexical_weight float DEFAULT 0.4
)
RETURNS TABLE (
    job_id uuid,
    semantic_score float,
    lexical_score float,
    hybrid_score float
)
LANGUAGE sql STABLE
AS $$
    WITH filtered AS (
        SELECT j.id
        FROM job_postings j
        WHERE j.status = 'active'
          AND (filter_remote IS NULL OR j.remote = filter_remote)
          AND (
                filter_location IS NULL
                OR j.location ILIKE '%' || filter_location || '%'
              )
          AND (
                filter_contract IS NULL
                OR j.contract_type ILIKE '%' || filter_contract || '%'
              )
    ),
    semantic AS (
        SELECT
            e.job_id,
            MAX(1 - (e.embedding <=> query_embedding))::float AS score
        FROM job_posting_embeddings e
        JOIN filtered f ON f.id = e.job_id
        GROUP BY e.job_id
    ),
    lexical AS (
        SELECT
            j.id AS job_id,
            ts_rank_cd(j.search_tsv, plainto_tsquery('english', coalesce(query_text, '')))::float AS score
        FROM job_postings j
        JOIN filtered f ON f.id = j.id
        WHERE query_text IS NOT NULL
          AND length(trim(query_text)) > 0
          AND j.search_tsv @@ plainto_tsquery('english', query_text)
    )
    SELECT
        coalesce(s.job_id, l.job_id) AS job_id,
        coalesce(s.score, 0)::float AS semantic_score,
        coalesce(l.score, 0)::float AS lexical_score,
        (
            coalesce(s.score, 0) * semantic_weight
            + coalesce(l.score, 0) * lexical_weight
        )::float AS hybrid_score
    FROM semantic s
    FULL OUTER JOIN lexical l ON s.job_id = l.job_id
    ORDER BY hybrid_score DESC
    LIMIT match_count;
$$;
