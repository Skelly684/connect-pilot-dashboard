-- NUCLEAR OPTION: Completely recreate everything from scratch
-- Step 1: Drop any existing trigger
DROP TRIGGER IF EXISTS trigger_queue_first_email ON public.leads CASCADE;

-- Step 2: Create trigger with absolute explicit syntax
CREATE TRIGGER trigger_queue_first_email
  BEFORE INSERT OR UPDATE
  ON public.leads
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND NEW.email_address IS NOT NULL)
  EXECUTE FUNCTION public.queue_first_email_on_accept();

-- Step 3: Verify it was created
DO $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_queue_first_email'
      AND event_object_table = 'leads'
  ) INTO v_exists;
  
  IF NOT v_exists THEN
    RAISE EXCEPTION '❌ TRIGGER WAS NOT CREATED!';
  ELSE
    RAISE NOTICE '✅ Trigger verified to exist';
  END IF;
END $$;

-- Step 4: Manually test on the most recent lead
UPDATE public.leads
SET 
  status = 'pending_review',
  updated_at = NOW()
WHERE id = '56c1be7e-8b49-471d-9d68-54432d76f2e1';

UPDATE public.leads
SET 
  status = 'accepted',
  updated_at = NOW()
WHERE id = '56c1be7e-8b49-471d-9d68-54432d76f2e1';