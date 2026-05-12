-- ============================================================
-- CareerAgent — Add language preference to profiles
-- ============================================================

-- Create the enum type for supported output languages
CREATE TYPE language_preference AS ENUM ('en', 'fr', 'nl');

-- Add the column with a sensible default
ALTER TABLE profiles
    ADD COLUMN language_preference language_preference DEFAULT 'en' NOT NULL;
