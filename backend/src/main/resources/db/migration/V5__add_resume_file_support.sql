-- V5: Add resume file upload support

-- Add resume file URL column
ALTER TABLE profiles 
ADD COLUMN resume_file_url TEXT;

-- Add metadata columns
ALTER TABLE profiles 
ADD COLUMN resume_file_name TEXT,
ADD COLUMN resume_uploaded_at TIMESTAMPTZ;

-- Index for file lookups
CREATE INDEX idx_profiles_resume_file 
ON profiles(resume_file_url) 
WHERE resume_file_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN profiles.resume_file_url IS 'Appwrite CDN URL for uploaded resume file';
COMMENT ON COLUMN profiles.resume_file_name IS 'Original filename of uploaded resume';
COMMENT ON COLUMN profiles.resume_uploaded_at IS 'Timestamp when resume was uploaded';
