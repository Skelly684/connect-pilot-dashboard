-- Reconnect email templates to campaigns
-- Pattern: campaign templates are named "{Campaign Name} - Email Template"

UPDATE campaigns c
SET initial_template_id = et.id
FROM email_templates et
WHERE et.name = c.name || ' - Email Template'
  AND et.user_id = c.user_id
  AND c.initial_template_id IS NULL;

-- Verify the fix
DO $$
DECLARE
  unlinked_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unlinked_count
  FROM campaigns
  WHERE initial_template_id IS NULL
    AND is_active = true;
    
  IF unlinked_count > 0 THEN
    RAISE NOTICE 'WARNING: % campaigns still have no template', unlinked_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All campaigns now have templates';
  END IF;
END $$;