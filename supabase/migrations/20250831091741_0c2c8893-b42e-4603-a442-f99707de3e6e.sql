-- First, let's make sure there's a profile for any existing user
-- We'll insert a profile for the current admin user
INSERT INTO profiles (id, email, is_admin) 
SELECT id, email, true
FROM auth.users 
WHERE email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  is_admin = EXCLUDED.is_admin;