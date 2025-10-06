-- Try creating the trigger with explicit schema and ENABLE command
CREATE OR REPLACE TRIGGER trigger_queue_first_email
  BEFORE INSERT OR UPDATE OF status, email_address, campaign_id
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_first_email_on_accept();

-- Force enable it
ALTER TABLE public.leads ENABLE TRIGGER trigger_queue_first_email;