-- V3__make_job_description_optional.sql
-- Make job_description column nullable in referral_requests table

ALTER TABLE referral_requests ALTER COLUMN job_description DROP NOT NULL;
