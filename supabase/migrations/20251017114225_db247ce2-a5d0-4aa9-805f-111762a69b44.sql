-- Create a function to delete old rejected leads (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rejected_leads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete rejected leads that were reviewed more than 24 hours ago
  DELETE FROM leads
  WHERE status = 'rejected'
    AND reviewed_at IS NOT NULL
    AND reviewed_at < NOW() - INTERVAL '24 hours';
  
  RAISE NOTICE 'Cleaned up old rejected leads';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_old_rejected_leads() TO authenticated;