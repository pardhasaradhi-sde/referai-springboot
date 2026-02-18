-- V1__initial_schema.sql
-- ReferAI local PostgreSQL schema (Spring Boot / Flyway managed)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------
-- USERS  (replaces Supabase auth.users)
-- ---------------------------------------------------------------
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------
CREATE TABLE profiles (
  id                   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email                TEXT UNIQUE NOT NULL,
  full_name            TEXT NOT NULL,
  role                 TEXT NOT NULL CHECK (role IN ('seeker', 'referrer', 'both')),

  -- Referrer-specific
  company              TEXT,
  job_title            TEXT,
  department           TEXT,
  seniority            TEXT,
  skills               TEXT[],
  years_of_experience  INTEGER,
  bio                  TEXT,
  linkedin_url         TEXT,

  -- Seeker-specific
  resume_url           TEXT,
  resume_text          TEXT,
  target_companies     TEXT[],

  -- Metadata
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  is_active            BOOLEAN DEFAULT TRUE
);

-- ---------------------------------------------------------------
-- REFERRAL REQUESTS
-- ---------------------------------------------------------------
CREATE TABLE referral_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seeker_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referrer_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  job_title        TEXT NOT NULL,
  job_description  TEXT NOT NULL,
  target_company   TEXT NOT NULL,

  match_score      DECIMAL(4,3),
  shared_skills    TEXT[],
  ai_explanation   TEXT,

  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','accepted','declined','expired')),
  initial_message  TEXT,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- ---------------------------------------------------------------
-- CONVERSATIONS
-- ---------------------------------------------------------------
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID UNIQUE NOT NULL REFERENCES referral_requests(id) ON DELETE CASCADE,
  seeker_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referrer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  is_active       BOOLEAN DEFAULT TRUE,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- MESSAGES
-- ---------------------------------------------------------------
CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  is_ai_suggested  BOOLEAN DEFAULT FALSE,
  was_edited       BOOLEAN DEFAULT FALSE,
  is_read          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- AI CACHE
-- ---------------------------------------------------------------
CREATE TABLE ai_cache (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key   TEXT UNIQUE NOT NULL,
  cache_type  TEXT NOT NULL,
  input_hash  TEXT NOT NULL,
  output_json JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- ---------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------
CREATE INDEX idx_profiles_role        ON profiles(role, is_active);
CREATE INDEX idx_profiles_company     ON profiles(company) WHERE company IS NOT NULL;
CREATE INDEX idx_requests_seeker      ON referral_requests(seeker_id, status);
CREATE INDEX idx_requests_referrer    ON referral_requests(referrer_id, status);
CREATE INDEX idx_conv_participants    ON conversations(seeker_id, referrer_id);
CREATE INDEX idx_messages_conv        ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_cache_key            ON ai_cache(cache_key);

-- ---------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_requests_updated_at
  BEFORE UPDATE ON referral_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
