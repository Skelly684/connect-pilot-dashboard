-- Drop and recreate the trigger to ensure it's enabled
DROP TRIGGER IF EXISTS trigger_queue_first_email ON leads;

CREATE TRIGGER trigger_queue_first_email
  BEFORE INSERT OR UPDATE OF status, email_address, campaign_id
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_first_email_on_accept();

-- Verify the trigger exists and is enabled
DO $$
DECLARE
  v_trigger_status char(1);
BEGIN
  SELECT tgenabled INTO v_trigger_status
  FROM pg_trigger 
  WHERE tgname = 'trigger_queue_first_email';
  
  IF v_trigger_status IS NULL THEN
    RAISE EXCEPTION '❌ Trigger does not exist!';
  ELSIF v_trigger_status = 'D' THEN
    RAISE EXCEPTION '❌ Trigger exists but is DISABLED!';
  ELSE
    RAISE NOTICE '✅ Trigger is ENABLED (status: %)', v_trigger_status;
  END IF;
END $$;