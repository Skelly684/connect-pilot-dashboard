-- Create function to update lead status when call is answered
CREATE OR REPLACE FUNCTION update_lead_status_on_answered_call()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a completed/answered call, update the lead status to 'replied'
  IF NEW.answered = true THEN
    UPDATE leads
    SET 
      status = 'replied',
      last_call_status = NEW.call_status,
      updated_at = now()
    WHERE id = NEW.lead_id
    AND status != 'replied'; -- Only update if not already replied
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on call_logs insert
DROP TRIGGER IF EXISTS trigger_update_lead_on_answered_call ON call_logs;
CREATE TRIGGER trigger_update_lead_on_answered_call
  AFTER INSERT ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_status_on_answered_call();