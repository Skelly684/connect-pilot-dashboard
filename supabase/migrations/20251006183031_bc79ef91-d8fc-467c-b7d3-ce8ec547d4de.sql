-- Simple, direct trigger creation
DROP TRIGGER IF EXISTS trigger_queue_first_email ON public.leads;

CREATE TRIGGER trigger_queue_first_email
  BEFORE INSERT OR UPDATE OF status, email_address, campaign_id
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_first_email_on_accept();