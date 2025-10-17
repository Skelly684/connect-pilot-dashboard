-- Fix security issues: Remove overly permissive public access policies

-- 1. Drop public access policies on campaigns table
DROP POLICY IF EXISTS "Campaigns Select" ON campaigns;
DROP POLICY IF EXISTS "Campaigns Insert" ON campaigns;
DROP POLICY IF EXISTS "Campaigns Update" ON campaigns;

-- 2. Drop public access policies on email_templates table
DROP POLICY IF EXISTS "Email Templates Select" ON email_templates;
DROP POLICY IF EXISTS "Email Templates Insert" ON email_templates;
DROP POLICY IF EXISTS "Email Templates Update" ON email_templates;

-- 3. Fix searchleads_jobs - the "Service role full access" policy should not allow public access
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role full access to export jobs" ON searchleads_jobs;

-- Create a proper service role policy that only allows service role (not public)
CREATE POLICY "Service role can manage export jobs" 
ON searchleads_jobs 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Note: The existing user-scoped policies remain intact:
-- - campaigns_select_owner, campaigns_insert_owner, campaigns_update_owner
-- - campaigns tenant read/write policies
-- - templates_read_scope policy
-- - Users can manage their own export jobs policy