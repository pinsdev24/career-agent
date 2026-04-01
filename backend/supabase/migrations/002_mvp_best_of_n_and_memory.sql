-- ============================================================
-- CareerAgent — MVP Evolution: Best-of-N + User Memory
-- ============================================================

-- ============================================================
-- 1. Best-of-N tracking columns on pipeline_runs
-- ============================================================

ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS best_draft TEXT;
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS best_score INTEGER DEFAULT 0;

-- ============================================================
-- 2. User memories table for long-term preference persistence
-- ============================================================

CREATE TABLE IF NOT EXISTS user_memories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    memory_key  text NOT NULL,           -- e.g. 'preferences', 'application_history', 'learned_patterns'
    memory_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),

    -- Each user has one record per memory_key
    UNIQUE(user_id, memory_key)
);

ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories"
    ON user_memories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own memories"
    ON user_memories FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on user_memories"
    ON user_memories FOR ALL
    USING (auth.role() = 'service_role');

-- Index for fast lookups by user_id + memory_key
CREATE INDEX IF NOT EXISTS idx_user_memories_user_key
    ON user_memories(user_id, memory_key);
