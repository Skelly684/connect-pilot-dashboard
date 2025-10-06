
-- Force create the trigger
DROP TRIGGER IF EXISTS trigger_queue_first_email ON leads;

CREATE TRIGGER trigger_queue_first_email
  BEFORE INSERT OR UPDATE OF status, email_address, campaign_id
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_first_email_on_accept();

-- Test it immediately on the most recent accepted lead
DO $$
DECLARE
  v_lead_id uuid := '9952722d-fe5c-44a0-b483-cf6d8efc7abe';
  v_trigger_count integer;
BEGIN
  -- Verify trigger was created
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'trigger_queue_first_email'
    AND event_object_table = 'leads';
    
  IF v_trigger_count = 0 THEN
    RAISE EXCEPTION 'ERROR: Trigger was not created!';
  ELSE
    RAISE NOTICE '✅ Trigger exists: % triggers found', v_trigger_count;
  END IF;
  
  -- Force the trigger to fire by updating the status
  RAISE NOTICE '🔄 Testing trigger on lead %', v_lead_id;
  
  UPDATE leads
  SET status = 'pending_review'
  WHERE id = v_lead_id;
  
  UPDATE leads  
  SET status = 'accepted'
  WHERE id = v_lead_id;
  
  RAISE NOTICE '✅ Trigger test complete';
END $$;
