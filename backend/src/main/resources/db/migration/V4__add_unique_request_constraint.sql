-- V4__add_unique_request_constraint.sql
-- Add unique constraint to prevent duplicate referral requests between same seeker and referrer

-- Create unique index to prevent duplicate pending/accepted requests
CREATE UNIQUE INDEX idx_unique_active_request
ON referral_requests(seeker_id, referrer_id)
WHERE status IN ('PENDING', 'ACCEPTED');

-- Add comment explaining the constraint
COMMENT ON INDEX idx_unique_active_request IS
'Ensures a seeker can only have one active (pending or accepted) request per referrer at a time';
