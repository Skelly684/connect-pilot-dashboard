
-- Fix the trigger to ALWAYS fire on INSERT/UPDATE, let the function decide
DROP TRIGGER IF EXISTS trigger_queue_first_email ON public.leads;

-- Recreate trigger WITHOUT the WHEN clause - let the function handle all logic
CREATE TRIGGER trigger_queue_first_email
  BEFORE INSERT OR UPDATE
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_first_email_on_accept();

-- Test immediately on existing accepted lead
UPDATE public.leads
SET updated_at = NOW()
WHERE id = 'afa03827-2faa-417b-aeea-f54fda0d086c';
