-- Check and fix the trigger by recreating it
DROP TRIGGER IF EXISTS trigger_queue_first_email ON leads;

CREATE TRIGGER trigger_queue_first_email
  BEFORE INSERT OR UPDATE OF status, email_address, campaign_id
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_first_email_on_accept();

-- Test by updating the recently accepted lead to trigger the email queue
DO $$
DECLARE
  v_test_lead_id uuid := 'cedb7b76-37f6-4407-b6f4-3cac0c5468be';
BEGIN
  -- Force trigger by updating
  UPDATE leads
  SET updated_at = NOW()
  WHERE id = v_test_lead_id;
  
  RAISE NOTICE 'Forced trigger for lead %', v_test_lead_id;
END $$;