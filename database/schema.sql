-- Internity Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jobs table: stores scraped job postings with AI-extracted metadata
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL, -- 'linkedin', 'indeed', etc.
    job_url TEXT NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    company VARCHAR(500),
    location VARCHAR(500),
    description TEXT,
    
    -- AI-extracted structured data (from GPT/Gemini)
    skills JSONB DEFAULT '[]'::jsonb, -- ["JavaScript", "React", ...]
    responsibilities JSONB DEFAULT '[]'::jsonb, -- ["Build features", ...]
    role_category VARCHAR(100), -- "Engineering", "Product", "Design"
    seniority VARCHAR(50), -- "Entry-level", "Mid-level", "Senior"
    work_style JSONB DEFAULT '[]'::jsonb, -- ["Remote", "Hybrid", "On-site"]
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- salary, benefits, etc.
    
    -- Timestamps
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT jobs_source_check CHECK (source IN ('linkedin', 'indeed', 'test', 'other'))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_scraped_at ON jobs(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_jobs_role_category ON jobs(role_category);

-- Job outcomes table: user decisions on each job
CREATE TABLE IF NOT EXISTS job_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_id UUID NOT NULL, -- from chrome.storage.local in extension
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- Outcome: what did the user do?
    outcome VARCHAR(50) NOT NULL,
    
    -- Behavioral metadata from extension
    metadata JSONB DEFAULT '{}'::jsonb, -- dwell_time_ms, scroll_depth, revisit_count
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT job_outcomes_outcome_check CHECK (outcome IN ('applied', 'currently_applying', 'not_applied')),
    CONSTRAINT unique_user_job UNIQUE (anonymous_id, job_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_outcomes_anonymous_id ON job_outcomes(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_job_id ON job_outcomes(job_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_outcome ON job_outcomes(outcome);
CREATE INDEX IF NOT EXISTS idx_outcomes_created_at ON job_outcomes(created_at DESC);

-- Optional: Behavior events table for detailed tracking
CREATE TABLE IF NOT EXISTS behavior_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_id UUID NOT NULL,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50) NOT NULL, -- 'view', 'scroll', 'revisit'
    event_data JSONB DEFAULT '{}'::jsonb, -- dwell_time, scroll_depth, etc.
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT behavior_events_type_check CHECK (event_type IN ('view', 'scroll', 'revisit', 'click'))
);

CREATE INDEX IF NOT EXISTS idx_events_anonymous_id ON behavior_events(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_events_job_id ON behavior_events(job_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON behavior_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON behavior_events(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_outcomes_updated_at BEFORE UPDATE ON job_outcomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Utility views for analytics

-- View: User application funnel
CREATE OR REPLACE VIEW user_funnel AS
SELECT 
    anonymous_id,
    COUNT(*) FILTER (WHERE outcome = 'applied') as applied_count,
    COUNT(*) FILTER (WHERE outcome = 'currently_applying') as currently_applying_count,
    COUNT(*) FILTER (WHERE outcome = 'not_applied') as not_applied_count,
    COUNT(*) as total_outcomes
FROM job_outcomes
GROUP BY anonymous_id;

-- View: Job popularity
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

-- Seed data for testing (optional)
INSERT INTO jobs (source, job_url, title, company, location, description, skills, responsibilities, role_category, seniority, work_style)
VALUES 
    ('test', 'https://example.com/job/1', 'Software Engineer', 'Tech Corp', 'San Francisco, CA', 
     'Build amazing products with React and Node.js', 
     '["JavaScript", "React", "Node.js", "TypeScript"]'::jsonb,
     '["Develop new features", "Write tests", "Code reviews"]'::jsonb,
     'Engineering', 'Mid-level', '["Remote", "Hybrid"]'::jsonb),
    
    ('test', 'https://example.com/job/2', 'Senior Full Stack Developer', 'StartupXYZ', 'New York, NY',
     'Lead development of our core platform using modern web technologies',
     '["Python", "Django", "React", "PostgreSQL", "Docker"]'::jsonb,
     '["Lead technical design", "Mentor junior developers", "Build scalable systems"]'::jsonb,
     'Engineering', 'Senior', '["On-site", "Hybrid"]'::jsonb),
    
    ('test', 'https://example.com/job/3', 'Junior Frontend Developer', 'DesignCo', 'Remote',
     'Join our team to build beautiful user interfaces',
     '["HTML", "CSS", "JavaScript", "Vue.js", "Figma"]'::jsonb,
     '["Implement UI designs", "Collaborate with designers", "Optimize performance"]'::jsonb,
     'Engineering', 'Entry-level', '["Remote"]'::jsonb)
ON CONFLICT (job_url) DO NOTHING;

-- Grant permissions (if using specific roles)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO internity_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO internity_app;
