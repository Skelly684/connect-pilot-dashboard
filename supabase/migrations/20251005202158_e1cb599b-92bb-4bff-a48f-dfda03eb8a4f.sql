
-- Create the trigger to automatically queue first email when lead is accepted
DROP TRIGGER IF EXISTS queue_first_email_on_accept_trigger ON leads;

CREATE TRIGGER queue_first_email_on_accept_trigger
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_first_email_on_accept();
