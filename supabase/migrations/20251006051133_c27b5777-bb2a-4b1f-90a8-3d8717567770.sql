-- Clean up duplicate triggers and keep only one working version
DROP TRIGGER IF EXISTS trigger_auto_queue_initial_email ON leads;
DROP TRIGGER IF EXISTS trg_auto_queue_initial_email ON leads;
DROP TRIGGER IF EXISTS trigger_queue_first_email_on_accept ON leads;
DROP TRIGGER IF EXISTS queue_first_email_on_accept_trigger ON leads;

DROP FUNCTION IF EXISTS auto_queue_initial_email();

-- Keep only the queue_first_email_on_accept function (it's the most complete)
-- And create one clean trigger
CREATE TRIGGER trigger_queue_first_email
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_first_email_on_accept();

-- Manually queue the email for the lead that was just accepted
SELECT queue_email_step(
  p_lead_id := '68c8ade2-6f7d-4552-94ce-d392c435be85',
  p_campaign_id := 'e793322c-d61e-4aa2-a24e-f45d91932691',
  p_step_number := 1,
  p_template_id := '9d76f007-1659-42d4-99c7-c84b53887912',
  p_to_email := 'scttskelly@gmail.com',
  p_subject := 'test 1',
  p_body := 'test 1',
  p_send_after := NOW()
);

-- Also clean up the stuck email with wrong lead_id
DELETE FROM email_outbox 
WHERE lead_id = '97f7aa2a-7129-48de-98f4-f4326fd13e17';