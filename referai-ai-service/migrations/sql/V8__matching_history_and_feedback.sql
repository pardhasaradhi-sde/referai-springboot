-- V8__matching_history_and_feedback.sql
-- Stores matching pipeline runs/candidates and enables feedback aggregate rows.

ALTER TABLE referral_outcomes
  ALTER COLUMN request_id DROP NOT NULL,
  ALTER COLUMN reporter_id DROP NOT NULL;

ALTER TABLE referral_outcomes
  DROP CONSTRAINT IF EXISTS referral_outcomes_outcome_type_check;

ALTER TABLE referral_outcomes
  ADD CONSTRAINT referral_outcomes_outcome_type_check
  CHECK (
    outcome_type IN (
      'GOT_REFERRAL',
      'GOT_INTERVIEW',
      'GOT_OFFER',
      'NO_RESPONSE',
      'DECLINED',
      'FEEDBACK_AGGREGATE'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_outcomes_feedback_aggregate
  ON referral_outcomes (outcome_type)
  WHERE outcome_type = 'FEEDBACK_AGGREGATE';

CREATE TABLE IF NOT EXISTS matching_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seeker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_company TEXT,
  jd_must_haves JSONB NOT NULL DEFAULT '[]'::jsonb,
  seeker_strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  seeker_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  implicit_referrer_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  retrieval_tier_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  feedback_patterns JSONB NOT NULL DEFAULT '{}'::jsonb,
  weight_recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_candidates_evaluated INTEGER NOT NULL DEFAULT 0,
  pipeline_timing JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matching_run_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES matching_runs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rank INTEGER,
  tier TEXT,
  semantic_score DOUBLE PRECISION,
  llm_score DOUBLE PRECISION,
  referral_viability DOUBLE PRECISION,
  reply_probability DOUBLE PRECISION,
  combined_score DOUBLE PRECISION,
  success_likelihood_percent INTEGER,
  reasoning TEXT,
  strong_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  opening_sentence TEXT,
  independent_assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matching_runs_seeker_created
  ON matching_runs(seeker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matching_run_candidates_run_id
  ON matching_run_candidates(run_id);
