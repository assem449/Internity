-- Internity Database Schema
-- Complete SQL script to create all tables, indexes, and functions
-- Run this directly in PostgreSQL or Docker container

-- Drop existing tables if they exist (careful in production!)
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ===========================================
-- USERS TABLE
-- ===========================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    preferences JSONB DEFAULT '{
        "jobTypes": [],
        "locations": [],
        "industries": [],
        "salaryRange": {},
        "remoteOnly": false,
        "notifications": {
            "email": true,
            "browser": true
        }
    }'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- User table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- User table comments
COMMENT ON TABLE users IS 'User accounts and authentication';
COMMENT ON COLUMN users.email IS 'Unique user email address';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN users.preferences IS 'User job search preferences in JSON format';

-- ===========================================
-- EVENTS TABLE
-- ===========================================

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (
        event_type IN (
            'job_viewed',
            'job_applied',
            'job_saved',
            'job_rejected',
            'recommendation_feedback'
        )
    ),
    job_url TEXT NOT NULL,
    job_title VARCHAR(500),
    company VARCHAR(200),
    location VARCHAR(200),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event table indexes for performance
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_job_url ON events(job_url);
CREATE INDEX idx_events_user_job ON events(user_id, job_url);
CREATE INDEX idx_events_user_type ON events(user_id, event_type);
CREATE INDEX idx_events_user_created ON events(user_id, created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_events_user_type_created ON events(user_id, event_type, created_at DESC);

-- JSONB indexes for metadata queries
CREATE INDEX idx_events_metadata ON events USING GIN(metadata);

-- Event table comments
COMMENT ON TABLE events IS 'Job tracking events for all users';
COMMENT ON COLUMN events.event_type IS 'Type of event: job_viewed, job_applied, job_saved, job_rejected, recommendation_feedback';
COMMENT ON COLUMN events.job_url IS 'Full URL of the job posting';
COMMENT ON COLUMN events.metadata IS 'Additional event data in JSON format';

-- ===========================================
-- FUNCTIONS AND TRIGGERS
-- ===========================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at column on row update';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- VIEWS (OPTIONAL BUT USEFUL)
-- ===========================================

-- View for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(DISTINCT e.id) as total_events,
    COUNT(DISTINCT e.id) FILTER (WHERE e.event_type = 'job_viewed') as jobs_viewed,
    COUNT(DISTINCT e.id) FILTER (WHERE e.event_type = 'job_applied') as jobs_applied,
    COUNT(DISTINCT e.id) FILTER (WHERE e.event_type = 'job_saved') as jobs_saved,
    COUNT(DISTINCT DATE(e.created_at)) as active_days,
    MAX(e.created_at) as last_activity,
    u.created_at as account_created
FROM users u
LEFT JOIN events e ON u.id = e.user_id
GROUP BY u.id, u.name, u.email, u.created_at;

COMMENT ON VIEW user_stats IS 'Aggregated statistics per user';

-- View for recent activity (last 30 days)
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    e.*,
    u.name as user_name,
    u.email as user_email
FROM events e
JOIN users u ON e.user_id = u.id
WHERE e.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY e.created_at DESC;

COMMENT ON VIEW recent_activity IS 'All events from the last 30 days';

-- ===========================================
-- USEFUL FUNCTIONS FOR ANALYTICS
-- ===========================================

-- Function to get user's application rate
CREATE OR REPLACE FUNCTION get_application_rate(p_user_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    views_count INTEGER;
    applications_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO views_count
    FROM events
    WHERE user_id = p_user_id AND event_type = 'job_viewed';
    
    SELECT COUNT(*) INTO applications_count
    FROM events
    WHERE user_id = p_user_id AND event_type = 'job_applied';
    
    IF views_count = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND((applications_count::NUMERIC / views_count::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_application_rate(INTEGER) IS 'Calculate percentage of viewed jobs that were applied to';

-- ===========================================
-- DATA RETENTION POLICY (OPTIONAL)
-- ===========================================

-- Function to archive old events
CREATE OR REPLACE FUNCTION archive_old_events(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM events
        WHERE created_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_old_events(INTEGER) IS 'Delete events older than specified days (default 90)';

-- ===========================================
-- INITIAL DATA / CONSTRAINTS
-- ===========================================

-- Ensure at least one admin user exists (optional)
-- You can customize this or remove it

-- ===========================================
-- GRANTS AND PERMISSIONS
-- ===========================================

-- Grant permissions to internity_user (if using dedicated user)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO internity_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO internity_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO internity_user;

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- List all tables
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check indexes
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public';

-- View table sizes
-- SELECT 
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ===========================================
-- EXAMPLE QUERIES
-- ===========================================

-- Get user stats
-- SELECT * FROM user_stats WHERE user_id = 1;

-- Get recent activity
-- SELECT * FROM recent_activity LIMIT 10;

-- Calculate application rate
-- SELECT get_application_rate(1);

-- Find users with no recent activity
-- SELECT u.id, u.name, u.email, MAX(e.created_at) as last_activity
-- FROM users u
-- LEFT JOIN events e ON u.id = e.user_id
-- GROUP BY u.id, u.name, u.email
-- HAVING MAX(e.created_at) < CURRENT_TIMESTAMP - INTERVAL '7 days' OR MAX(e.created_at) IS NULL;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Tables created: users, events';
    RAISE NOTICE 'Views created: user_stats, recent_activity';
    RAISE NOTICE 'Functions created: update_updated_at_column, get_application_rate, archive_old_events';
END $$;
