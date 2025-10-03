-- Fix the trigger function to properly update lead status on answered calls
CREATE OR REPLACE FUNCTION update_lead_status_on_answered_call()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an answered call, update the lead status to 'replied'
  -- Only if the current status is not already 'replied' or better
  IF NEW.answered IS TRUE THEN
    UPDATE leads
    SET 
      status = 'replied',
      last_call_status = NEW.call_status,
      updated_at = now()
    WHERE id = NEW.lead_id
    AND status NOT IN ('replied', 'accepted', 'rejected');
    
    -- Log for debugging
    RAISE NOTICE 'Updated lead % to replied status', NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;