-- ============================================================
-- CareerAgent Job OS — applications, packets, inbox, CV versions
-- Catalog tables live in 004_job_engine_catalog.sql
-- ============================================================

-- Pipeline failure details were written by the runner with no column.
ALTER TABLE pipeline_runs
    ADD COLUMN IF NOT EXISTS error_details jsonb;

-- ============================================================
-- Profile constraints (feed eligibility)
-- ============================================================

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
    ADD COLUMN IF NOT EXISTS work_auth text,
    ADD COLUMN IF NOT EXISTS salary_min integer,
    ADD COLUMN IF NOT EXISTS seniority text,
    ADD COLUMN IF NOT EXISTS active_cv_version_id uuid;

-- ============================================================
-- cv_versions — immutable CV snapshots + Storage pointer
-- ============================================================

CREATE TABLE IF NOT EXISTS cv_versions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    storage_path    text,
    raw_text        text,
    structured      jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_versions_user
    ON cv_versions (user_id, created_at DESC);

ALTER TABLE cv_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cv versions"
    ON cv_versions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cv versions"
    ON cv_versions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on cv_versions"
    ON cv_versions FOR ALL
    USING (auth.role() = 'service_role');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_active_cv_version_id_fkey'
    ) THEN
        ALTER TABLE profiles
            ADD CONSTRAINT profiles_active_cv_version_id_fkey
            FOREIGN KEY (active_cv_version_id) REFERENCES cv_versions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- applications — first-class application lifecycle
-- ============================================================

CREATE TYPE application_status AS ENUM (
    'draft',
    'generating',
    'packet_ready',
    'approved',
    'submitted',
    'interviewing',
    'rejected',
    'withdrawn'
);

CREATE TABLE IF NOT EXISTS applications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    posting_id      uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    status          application_status NOT NULL DEFAULT 'draft',
    pipeline_run_id uuid REFERENCES pipeline_runs(id) ON DELETE SET NULL,
    error_details   jsonb,
    submitted_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, posting_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_user_status
    ON applications (user_id, status, updated_at DESC);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
    ON applications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
    ON applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
    ON applications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on applications"
    ON applications FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- application_packets — generated artifacts
-- ============================================================

CREATE TABLE IF NOT EXISTS application_packets (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    gap_report      jsonb,
    draft_letter    text,
    final_letter    text,
    critic_score    jsonb,
    best_draft      text,
    best_score      integer DEFAULT 0,
    revision_count  integer NOT NULL DEFAULT 0,
    user_feedback   text,
    model_meta      jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_application_packets_app
    ON application_packets (application_id, created_at DESC);

ALTER TABLE application_packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own packets"
    ON application_packets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM applications a
            WHERE a.id = application_id AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role full access on application_packets"
    ON application_packets FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- work_items — HITL inbox (graph is a worker, not the UX)
-- ============================================================

CREATE TYPE work_item_type AS ENUM (
    'review_packet',
    'confirm_submitted'
);

CREATE TYPE work_item_status AS ENUM (
    'open',
    'done',
    'cancelled'
);

CREATE TABLE IF NOT EXISTS work_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    application_id  uuid REFERENCES applications(id) ON DELETE CASCADE,
    item_type       work_item_type NOT NULL,
    status          work_item_status NOT NULL DEFAULT 'open',
    payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_items_inbox
    ON work_items (user_id, status, created_at DESC);

ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own work items"
    ON work_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own work items"
    ON work_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on work_items"
    ON work_items FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- usage_events — token / Tavily spend for quotas
-- ============================================================

CREATE TABLE IF NOT EXISTS usage_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
    kind        text NOT NULL,
    tokens      integer NOT NULL DEFAULT 0,
    meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_created
    ON usage_events (user_id, created_at DESC);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
    ON usage_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on usage_events"
    ON usage_events FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- CV Storage bucket (private)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own CVs"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'cvs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can read own CVs"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'cvs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update own CVs"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'cvs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
