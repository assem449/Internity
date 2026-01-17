-- Internity Database Seed Data
-- Creates clean database ready for real users
-- NO MOCK DATA - Real production setup

-- Clear existing data (careful in production!)
TRUNCATE TABLE events CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- Database is ready for real users!
-- Users will be created when they register through the extension

-- ===========================================
-- VERIFICATION
-- ===========================================

-- Display summary
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully!';
    RAISE NOTICE 'Ready to accept real user registrations';
    RAISE NOTICE 'Users will be created when they register through the extension';
END $$;

