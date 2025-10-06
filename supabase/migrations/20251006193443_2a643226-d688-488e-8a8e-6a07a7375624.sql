-- Drop and recreate the trigger to ensure it fires on INSERT
DROP TRIGGER IF EXISTS trigger_queue_first_email ON leads;

CREATE TRIGGER trigger_queue_first_email
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_first_email_on_accept();

-- Verify trigger is created
SELECT 
  tgname as trigger_name,
  tgtype,
  tgenabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_queue_first_email';