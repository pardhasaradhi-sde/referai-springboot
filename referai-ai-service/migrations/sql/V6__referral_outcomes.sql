-- V6__referral_outcomes.sql
-- Stores referral outcomes and context snapshot for learning feedback loop.

CREATE TABLE IF NOT EXISTS referral_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES referral_requests(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('GOT_REFERRAL','GOT_INTERVIEW','GOT_OFFER','NO_RESPONSE','DECLINED')),
  context_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_outcomes_request_id ON referral_outcomes(request_id);
CREATE INDEX IF NOT EXISTS idx_referral_outcomes_outcome_type ON referral_outcomes(outcome_type);
CREATE INDEX IF NOT EXISTS idx_referral_outcomes_created_at ON referral_outcomes(created_at DESC);

