-- V2__convert_to_enums.sql
-- Convert role and status columns to use uppercase enum values

-- Update profiles.role to uppercase enum values
UPDATE profiles SET role = 'SEEKER' WHERE role = 'seeker';
UPDATE profiles SET role = 'REFERRER' WHERE role = 'referrer';
UPDATE profiles SET role = 'BOTH' WHERE role = 'both';

-- Update referral_requests.status to uppercase enum values
UPDATE referral_requests SET status = 'PENDING' WHERE status = 'pending';
UPDATE referral_requests SET status = 'ACCEPTED' WHERE status = 'accepted';
UPDATE referral_requests SET status = 'DECLINED' WHERE status = 'declined';
UPDATE referral_requests SET status = 'EXPIRED' WHERE status = 'expired';

-- Update check constraints to use uppercase values
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('SEEKER', 'REFERRER', 'BOTH'));

ALTER TABLE referral_requests DROP CONSTRAINT IF EXISTS referral_requests_status_check;
ALTER TABLE referral_requests ADD CONSTRAINT referral_requests_status_check
    CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'));
