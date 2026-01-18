-- Internity Database Schema (Simplified: LinkedIn-only)
-- PostgreSQL 14+

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------
-- Jobs table (LinkedIn-only)
-- ----------------------------
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    job_url TEXT NOT NULL UNIQUE,          -- LinkedIn URL
    title VARCHAR(500) NOT NULL,
    company VARCHAR(500),
    location VARCHAR(500),
    description TEXT,

    -- AI-extracted structured data
    skills JSONB DEFAULT '[]'::jsonb,              -- ["JavaScript", "React", ...]

    -- Timestamps
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_scraped_at ON jobs(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs USING GIN (skills);

-- ----------------------------
-- Job outcomes table: user decisions on each job
-- ----------------------------
CREATE TABLE IF NOT EXISTS job_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_id UUID NOT NULL, -- from chrome.storage.local in extension
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

    outcome VARCHAR(50) NOT NULL, -- applied/currently_applying/not_applied

    -- Behavioral metadata from extension:
    -- dwell_time_ms, scroll_depth, revisit_count
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT job_outcomes_outcome_check CHECK (outcome IN ('applied', 'currently_applying', 'not_applied')),
    CONSTRAINT unique_user_job UNIQUE (anonymous_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_outcomes_anonymous_id ON job_outcomes(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_job_id ON job_outcomes(job_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_outcome ON job_outcomes(outcome);
CREATE INDEX IF NOT EXISTS idx_outcomes_created_at ON job_outcomes(created_at DESC);

-- ----------------------------
-- Behavior events table (optional detailed tracking)
-- ----------------------------
CREATE TABLE IF NOT EXISTS behavior_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_id UUID NOT NULL,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,

    event_type VARCHAR(50) NOT NULL, -- 'view','scroll','revisit','click'
    event_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT behavior_events_type_check CHECK (event_type IN ('view', 'scroll', 'revisit', 'click'))
);

CREATE INDEX IF NOT EXISTS idx_events_anonymous_id ON behavior_events(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_events_job_id ON behavior_events(job_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON behavior_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON behavior_events(created_at DESC);

-- ----------------------------
-- User skill matrix (34 fixed skill columns)
-- 3 rows per user: metric = 'E' (engagement), 'O' (outcome 0/1), 'I' (interest)
-- ----------------------------
CREATE TABLE IF NOT EXISTS user_skill_matrix (
  anonymous_id UUID NOT NULL,
  metric CHAR(1) NOT NULL,  -- 'E', 'O', 'I'

  linux DOUBLE PRECISION NOT NULL DEFAULT 0,
  agile DOUBLE PRECISION NOT NULL DEFAULT 0,
  swift DOUBLE PRECISION NOT NULL DEFAULT 0,
  graphql DOUBLE PRECISION NOT NULL DEFAULT 0,
  ai DOUBLE PRECISION NOT NULL DEFAULT 0,
  cicd DOUBLE PRECISION NOT NULL DEFAULT 0,
  javascript DOUBLE PRECISION NOT NULL DEFAULT 0,
  go DOUBLE PRECISION NOT NULL DEFAULT 0,
  nodejs DOUBLE PRECISION NOT NULL DEFAULT 0,
  aws DOUBLE PRECISION NOT NULL DEFAULT 0,
  jenkins DOUBLE PRECISION NOT NULL DEFAULT 0,
  git DOUBLE PRECISION NOT NULL DEFAULT 0,
  api DOUBLE PRECISION NOT NULL DEFAULT 0,
  microservices DOUBLE PRECISION NOT NULL DEFAULT 0,
  python DOUBLE PRECISION NOT NULL DEFAULT 0,
  dotnet DOUBLE PRECISION NOT NULL DEFAULT 0,
  typescript DOUBLE PRECISION NOT NULL DEFAULT 0,
  java DOUBLE PRECISION NOT NULL DEFAULT 0,
  angular DOUBLE PRECISION NOT NULL DEFAULT 0,
  express DOUBLE PRECISION NOT NULL DEFAULT 0,
  sql DOUBLE PRECISION NOT NULL DEFAULT 0,
  html DOUBLE PRECISION NOT NULL DEFAULT 0,
  css DOUBLE PRECISION NOT NULL DEFAULT 0,
  github DOUBLE PRECISION NOT NULL DEFAULT 0,
  scrum DOUBLE PRECISION NOT NULL DEFAULT 0,
  machine_learning DOUBLE PRECISION NOT NULL DEFAULT 0,
  tensorflow DOUBLE PRECISION NOT NULL DEFAULT 0,
  pytorch DOUBLE PRECISION NOT NULL DEFAULT 0,
  react DOUBLE PRECISION NOT NULL DEFAULT 0,
  azure DOUBLE PRECISION NOT NULL DEFAULT 0,
  google_cloud DOUBLE PRECISION NOT NULL DEFAULT 0,
  docker DOUBLE PRECISION NOT NULL DEFAULT 0,
  kubernetes DOUBLE PRECISION NOT NULL DEFAULT 0,
  rest DOUBLE PRECISION NOT NULL DEFAULT 0,

  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (anonymous_id, metric),
  CONSTRAINT user_skill_matrix_metric_check CHECK (metric IN ('E','O','I'))
);

CREATE INDEX IF NOT EXISTS idx_user_skill_matrix_anon ON user_skill_matrix(anonymous_id);

-- Helper: ensure 3 rows exist for a user (E/O/I)
CREATE OR REPLACE FUNCTION ensure_user_skill_matrix_rows(p_anonymous_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_skill_matrix (anonymous_id, metric) VALUES (p_anonymous_id, 'E')
  ON CONFLICT (anonymous_id, metric) DO NOTHING;

  INSERT INTO user_skill_matrix (anonymous_id, metric) VALUES (p_anonymous_id, 'O')
  ON CONFLICT (anonymous_id, metric) DO NOTHING;

  INSERT INTO user_skill_matrix (anonymous_id, metric) VALUES (p_anonymous_id, 'I')
  ON CONFLICT (anonymous_id, metric) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------
-- updated_at trigger helper
-- ----------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers (create only if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_jobs_updated_at') THEN
    CREATE TRIGGER update_jobs_updated_at
      BEFORE UPDATE ON jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_job_outcomes_updated_at') THEN
    CREATE TRIGGER update_job_outcomes_updated_at
      BEFORE UPDATE ON job_outcomes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_skill_matrix_updated_at') THEN
    CREATE TRIGGER update_user_skill_matrix_updated_at
      BEFORE UPDATE ON user_skill_matrix
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- ----------------------------
-- Utility views for analytics
-- ----------------------------
CREATE OR REPLACE VIEW user_funnel AS
SELECT
    anonymous_id,
    COUNT(*) FILTER (WHERE outcome = 'applied') as applied_count,
    COUNT(*) FILTER (WHERE outcome = 'currently_applying') as currently_applying_count,
    COUNT(*) FILTER (WHERE outcome = 'not_applied') as not_applied_count,
    COUNT(*) as total_outcomes
FROM job_outcomes
GROUP BY anonymous_id;

CREATE OR REPLACE VIEW job_popularity AS
SELECT
    j.id,
    j.title,
    j.company,
    COUNT(o.id) as total_interactions,
    COUNT(*) FILTER (WHERE o.outcome IN ('applied', 'currently_applying')) as application_count,
    COUNT(*) FILTER (WHERE o.outcome = 'not_applied') as rejection_count
FROM jobs j
LEFT JOIN job_outcomes o ON j.id = o.job_id
GROUP BY j.id, j.title, j.company;
