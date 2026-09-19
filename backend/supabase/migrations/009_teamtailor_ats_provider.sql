-- Teamtailor as catalog ATS #5
-- companies.ats_provider CHECK must include the new provider or upserts fail.

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_ats_provider_check;
ALTER TABLE companies ADD CONSTRAINT companies_ats_provider_check
    CHECK (ats_provider IN (
        'greenhouse', 'lever', 'ashby', 'workable', 'teamtailor', 'unknown'
    ));
