
-- Fix the abc campaign email sequence
-- Campaign ID: fe593741-f5b6-4912-bfa6-1f309700c2ae

-- Delete existing steps
DELETE FROM campaign_email_steps 
WHERE campaign_id = 'fe593741-f5b6-4912-bfa6-1f309700c2ae';

-- Insert correct sequence:
-- Step 1: "aaa" template (abc - Email Template) - send immediately (0 mins)
INSERT INTO campaign_email_steps (campaign_id, step_number, template_id, send_offset_minutes, is_active)
VALUES ('fe593741-f5b6-4912-bfa6-1f309700c2ae', 1, '552b787f-0767-4a35-91c1-b6d900b635d8', 0, true);

-- Step 2: "bbb" template (abc - Step 1) - send 5 mins after step 1
INSERT INTO campaign_email_steps (campaign_id, step_number, template_id, send_offset_minutes, is_active)
VALUES ('fe593741-f5b6-4912-bfa6-1f309700c2ae', 2, 'b2f25b25-317e-4ead-90cb-bba4f0ae43cb', 5, true);

-- Step 3: "ccc" template (abc - Step 2) - send 10 mins after step 2 (15 mins total)
INSERT INTO campaign_email_steps (campaign_id, step_number, template_id, send_offset_minutes, is_active)
VALUES ('fe593741-f5b6-4912-bfa6-1f309700c2ae', 3, '62ea3022-27d0-4307-8104-2b52a6e8848f', 10, true);
