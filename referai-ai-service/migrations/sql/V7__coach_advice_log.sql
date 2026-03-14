-- V7__coach_advice_log.sql
-- Tracks coach advice history and whether it was followed.

CREATE TABLE IF NOT EXISTS coach_advice_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES referral_requests(id) ON DELETE SET NULL,
  seeker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  advice_text TEXT NOT NULL,
  advice_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  was_followed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_advice_log_conversation_id ON coach_advice_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_coach_advice_log_request_id ON coach_advice_log(request_id);
CREATE INDEX IF NOT EXISTS idx_coach_advice_log_created_at ON coach_advice_log(created_at DESC);

