
-- Insert missing email steps for campaigns that have templates but no steps
-- This fixes the issue where templates were created but steps weren't saved

INSERT INTO campaign_email_steps (campaign_id, step_number, template_id, send_offset_minutes, is_active)
SELECT 
  et.campaign_id,
  ROW_NUMBER() OVER (PARTITION BY et.campaign_id ORDER BY et.created_at) as step_number,
  et.id as template_id,
  (ROW_NUMBER() OVER (PARTITION BY et.campaign_id ORDER BY et.created_at) - 1) * 1440 as send_offset_minutes,
  true as is_active
FROM email_templates et
WHERE et.campaign_id IS NOT NULL
AND et.name LIKE '% - Step %'
AND NOT EXISTS (
  SELECT 1 FROM campaign_email_steps ces 
  WHERE ces.template_id = et.id
)
ON CONFLICT DO NOTHING;
