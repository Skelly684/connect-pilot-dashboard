-- Test trigger by updating the lead
DO $$
BEGIN
  RAISE NOTICE 'Manual test: Updating lead to trigger email queue';
  
  UPDATE leads 
  SET updated_at = NOW()
  WHERE id = 'f3934e32-67e5-4306-a6f1-f30f1c7b8ed9';
  
  RAISE NOTICE 'Manual test complete';
END $$;