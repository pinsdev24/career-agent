-- Cut 3a: structured geo on job_postings + hard country filter in search RPCs.
-- country_code is ISO 3166-1 alpha-2. city is a best-effort display/soft-rank hint.
-- Backfill is best-effort from location text; Python ingest re-parses on every upsert.

ALTER TABLE job_postings
    ADD COLUMN IF NOT EXISTS country_code char(2),
    ADD COLUMN IF NOT EXISTS city text;

CREATE INDEX IF NOT EXISTS idx_job_postings_country_code
    ON job_postings (country_code)
    WHERE status = 'active' AND country_code IS NOT NULL;

-- Best-effort SQL backfill for common ATS locations. Remaining NULLs are filled
-- by job-engine JobRepository.backfill_country_codes / the next board sync.
UPDATE job_postings
SET country_code = CASE
    WHEN location ~* '(belgium|belgique|belgi[eë]|brussels|bruxelles|brussel|ghent|gent|antwerp|antwerpen)' THEN 'BE'
    WHEN location ~* '(netherlands|nederland|holland|amsterdam|rotterdam|utrecht|eindhoven|den haag|the hague)' THEN 'NL'
    WHEN location ~* '(luxembourg|luxemburg)' THEN 'LU'
    WHEN location ~* '(france|paris|lyon|lille|marseille|toulouse|nantes|bordeaux|île-de-france|ile-de-france)' THEN 'FR'
    WHEN location ~* '(germany|deutschland|berlin|munich|münchen|hamburg|frankfurt|cologne|köln)' THEN 'DE'
    WHEN location ~* '(united kingdom|\yuk\y|great britain|england|london|manchester|edinburgh)' THEN 'GB'
    WHEN location ~* '(ireland|dublin|\yeire\y)' THEN 'IE'
    WHEN location ~* '(spain|españa|espana|madrid|barcelona)' THEN 'ES'
    WHEN location ~* '(italy|italia|rome|roma|milan|milano)' THEN 'IT'
    WHEN location ~* '(portugal|lisbon|lisboa)' THEN 'PT'
    WHEN location ~* '(switzerland|schweiz|suisse|zurich|zürich|geneva|genève)' THEN 'CH'
    WHEN location ~* '(austria|österreich|vienna|wien)' THEN 'AT'
    WHEN location ~* '(sweden|sverige|stockholm)' THEN 'SE'
    WHEN location ~* '(norway|norge|oslo)' THEN 'NO'
    WHEN location ~* '(denmark|danmark|copenhagen)' THEN 'DK'
    WHEN location ~* '(poland|polska|warsaw|warszawa)' THEN 'PL'
    WHEN location ~* '(united states|\yusa\y|new york|\ynyc\y|san francisco|seattle|austin|boston|chicago|los angeles)' THEN 'US'
    WHEN location ~* '(canada|toronto|montreal|vancouver)' THEN 'CA'
    WHEN location ~* '(argentina|buenos aires)' THEN 'AR'
    WHEN location ~* '(australia|sydney|melbourne)' THEN 'AU'
    WHEN location ~* '(singapore)' THEN 'SG'
    WHEN location ~* '(india|bangalore|bengaluru|hyderabad|mumbai)' THEN 'IN'
    WHEN location ~* ',\s*(BE)\s*$' THEN 'BE'
    WHEN location ~* ',\s*(NL)\s*$' THEN 'NL'
    WHEN location ~* ',\s*(FR)\s*$' THEN 'FR'
    WHEN location ~* ',\s*(DE)\s*$' THEN 'DE'
    WHEN location ~* ',\s*(UK|GB)\s*$' THEN 'GB'
    WHEN location ~* ',\s*(US|USA)\s*$' THEN 'US'
    ELSE country_code
END
WHERE country_code IS NULL
  AND location IS NOT NULL
  AND length(trim(location)) > 0;

CREATE OR REPLACE FUNCTION job_country_matches(job_country char, filter_countries text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT
        filter_countries IS NULL
        OR length(trim(filter_countries)) = 0
        OR (
            job_country IS NOT NULL
            AND upper(trim(job_country::text)) = ANY (
                SELECT upper(trim(code))
                FROM unnest(string_to_array(filter_countries, '|')) AS code
                WHERE length(trim(code)) = 2
            )
        );
$$;

CREATE OR REPLACE FUNCTION match_job_postings(
    query_embedding vector(1536),
    match_count int DEFAULT 50,
    match_threshold float DEFAULT 0.2,
    filter_remote boolean DEFAULT NULL,
    filter_location text DEFAULT NULL,
    filter_contract text DEFAULT NULL,
    filter_countries text DEFAULT NULL
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
          AND (
                (
                  filter_countries IS NOT NULL
                  AND length(trim(filter_countries)) > 0
                  AND job_country_matches(j.country_code, filter_countries)
                )
                OR (
                    (filter_countries IS NULL OR length(trim(filter_countries)) = 0)
                    AND job_location_matches(j.location, filter_location)
                )
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
    lexical_weight float DEFAULT 0.4,
    filter_countries text DEFAULT NULL
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
          AND (
                (
                  filter_countries IS NOT NULL
                  AND length(trim(filter_countries)) > 0
                  AND job_country_matches(j.country_code, filter_countries)
                )
                OR (
                    (filter_countries IS NULL OR length(trim(filter_countries)) = 0)
                    AND job_location_matches(j.location, filter_location)
                )
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
