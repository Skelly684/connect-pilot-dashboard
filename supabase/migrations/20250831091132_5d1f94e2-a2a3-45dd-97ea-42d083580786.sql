-- Disable public sign-ups by updating auth config
-- This will prevent self sign-up and only allow admin-created users
UPDATE auth.config SET enable_signup = false;