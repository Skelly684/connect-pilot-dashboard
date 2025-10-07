
-- Fix duplicate "aaa" email issue by removing step 1 and renumbering subsequent steps
-- This ensures the first email "aaa" only sends once

-- Delete the duplicate step 1 that uses the same template as step 0
DELETE FROM campaign_email_steps 
WHERE campaign_id IN (SELECT id FROM campaigns WHERE name = 'abc')
  AND step_number = 1;

-- Renumber step 2 to become step 1
UPDATE campaign_email_steps
SET step_number = 1
WHERE campaign_id IN (SELECT id FROM campaigns WHERE name = 'abc')
  AND step_number = 2;

-- Renumber step 3 to become step 2
UPDATE campaign_email_steps
SET step_number = 2
WHERE campaign_id IN (SELECT id FROM campaigns WHERE name = 'abc')
  AND step_number = 3;
