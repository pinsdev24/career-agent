-- ============================================================
-- CareerAgent — Initial schema
-- Run this in your Supabase SQL editor: https://supabase.com/dashboard/project/nbyxjxjpzvovxhoelkzx/sql
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Custom types
-- ============================================================

CREATE TYPE entry_mode AS ENUM ('explore', 'url');
CREATE TYPE pipeline_status AS ENUM (
    'started', 'scouting', 'waiting_offer_selection',
    'matching', 'writing', 'critiquing',
    'waiting_letter_review', 'completed', 'failed'
);
CREATE TYPE tone_of_voice AS ENUM (
    'professional', 'conversational', 'enthusiastic', 'formal', 'concise'
);

-- ============================================================
-- profiles
-- ============================================================

CREATE TABLE profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cv_raw_text text,
    cv_structured jsonb DEFAULT '{}'::jsonb,
    tone_of_voice tone_of_voice DEFAULT 'professional',
    search_preferences jsonb DEFAULT '{}'::jsonb,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- job_offers
-- ============================================================

CREATE TABLE job_offers (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    url         text UNIQUE NOT NULL,
    raw_text    text,
    structured  jsonb DEFAULT '{}'::jsonb,
    source      text DEFAULT 'tavily',
    expires_at  timestamptz DEFAULT (now() + interval '7 days'),
    created_at  timestamptz DEFAULT now()
);

-- No RLS on job_offers — shared resource across users

-- ============================================================
-- pipeline_runs
-- ============================================================

CREATE TABLE pipeline_runs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    entry_mode      entry_mode NOT NULL,
    status          pipeline_status DEFAULT 'started',
    offer_url       text,
    offer_id        uuid REFERENCES job_offers(id) ON DELETE SET NULL,
    discovered_offers jsonb,
    selected_offer  jsonb,
    gap_report      jsonb,
    draft_letter    text,
    final_letter    text,
    critic_score    jsonb,
    revision_count  int DEFAULT 0,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own runs"
    ON pipeline_runs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own runs"
    ON pipeline_runs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own runs"
    ON pipeline_runs FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- cv_embeddings
-- ============================================================

CREATE TABLE cv_embeddings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    chunk_text  text NOT NULL,
    chunk_type  text DEFAULT 'full',
    embedding   vector(1536) NOT NULL,
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE cv_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cv embeddings"
    ON cv_embeddings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cv embeddings"
    ON cv_embeddings FOR ALL
    USING (auth.uid() = user_id);

-- HNSW index for fast similarity search
CREATE INDEX idx_cv_embeddings_hnsw
    ON cv_embeddings USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- offer_embeddings
-- ============================================================

CREATE TABLE offer_embeddings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id    uuid NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
    chunk_text  text NOT NULL,
    chunk_type  text DEFAULT 'full',
    embedding   vector(1536) NOT NULL,
    created_at  timestamptz DEFAULT now()
);

-- No user-specific RLS — offer embeddings are shared

-- HNSW index
CREATE INDEX idx_offer_embeddings_hnsw
    ON offer_embeddings USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- Similarity search functions
-- ============================================================

CREATE OR REPLACE FUNCTION match_cv_embeddings(
    query_embedding vector(1536),
    target_user_id uuid,
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
    id uuid,
    chunk_text text,
    chunk_type text,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        e.id,
        e.chunk_text,
        e.chunk_type,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM cv_embeddings e
    WHERE e.user_id = target_user_id
      AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION match_offer_embeddings(
    query_embedding vector(1536),
    target_offer_id uuid,
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
    id uuid,
    chunk_text text,
    chunk_type text,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        e.id,
        e.chunk_text,
        e.chunk_type,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM offer_embeddings e
    WHERE e.offer_id = target_offer_id
      AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ============================================================
-- Service role bypass policies (for backend with service_role key)
-- ============================================================

CREATE POLICY "Service role full access on profiles"
    ON profiles FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on pipeline_runs"
    ON pipeline_runs FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on cv_embeddings"
    ON cv_embeddings FOR ALL
    USING (auth.role() = 'service_role');
