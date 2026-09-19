-- P0: NULL country_code is unknown, not a miss.
-- Migration 007's job_country_matches required job_country IS NOT NULL, so
-- incomplete backfill dropped most of the active catalog whenever a country
-- filter (profile or Jobs bar) was on.
-- Known codes outside the selected ISO set still fail (Argentina ≠ BE).

CREATE OR REPLACE FUNCTION job_country_matches(job_country char, filter_countries text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT
        filter_countries IS NULL
        OR length(trim(filter_countries)) = 0
        OR job_country IS NULL
        OR upper(trim(job_country::text)) = ANY (
            SELECT upper(trim(code))
            FROM unnest(string_to_array(filter_countries, '|')) AS code
            WHERE length(trim(code)) = 2
        );
$$;
