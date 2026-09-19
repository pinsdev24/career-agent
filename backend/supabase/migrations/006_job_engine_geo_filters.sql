-- Honest geo/remote filters + board health columns for Job Engine.
-- filter_location may be a single term or pipe-separated aliases (Belgium|Brussels|Bruxelles|…).
-- filter_remote=false keeps unknown (NULL) and onsite rows; only remote=true is excluded.

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS consecutive_empty_syncs int NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS inactive_reason text;

CREATE OR REPLACE FUNCTION job_location_matches(job_location text, filter_location text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT
        filter_location IS NULL
        OR length(trim(filter_location)) = 0
        OR EXISTS (
            SELECT 1
            FROM unnest(string_to_array(filter_location, '|')) AS alias(term)
            WHERE length(trim(alias.term)) >= 3
              AND coalesce(job_location, '') ILIKE '%' || trim(alias.term) || '%'
        );
$$;

CREATE OR REPLACE FUNCTION job_remote_matches(job_remote boolean, filter_remote boolean)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT
        filter_remote IS NULL
        OR (filter_remote IS TRUE AND job_remote IS TRUE)
        OR (filter_remote IS FALSE AND job_remote IS NOT TRUE);
$$;

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
      AND job_remote_matches(j.remote, filter_remote)
      AND job_location_matches(j.location, filter_location)
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
          AND job_remote_matches(j.remote, filter_remote)
          AND job_location_matches(j.location, filter_location)
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
