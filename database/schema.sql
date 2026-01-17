-- Reset (dev only)
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;

-- Needed for UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===========================================
-- JOBS TABLE (from scraper)
-- ===========================================
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,

  source VARCHAR(50) NOT NULL,
  job_url TEXT NOT NULL UNIQUE,

  title VARCHAR(500) NOT NULL,
  company VARCHAR(200),
  location VARCHAR(200),
  description TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_metadata ON jobs USING GIN(metadata);

-- ===========================================
-- APPLICATIONS TABLE (what user applied to)
-- ===========================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  anonymous_id UUID NOT NULL,          -- saved in extension (chrome.storage.local)
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- prevent duplicates (same user applying same job twice)
CREATE UNIQUE INDEX uniq_applications_user_job ON applications(anonymous_id, job_id);

-- useful indexes
CREATE INDEX idx_applications_anonymous_id ON applications(anonymous_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_applied_at ON applications(applied_at);
