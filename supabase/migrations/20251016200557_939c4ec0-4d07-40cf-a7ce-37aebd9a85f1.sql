-- Enable RLS on searchleads_jobs
ALTER TABLE searchleads_jobs ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own export jobs
CREATE POLICY "Users can manage their own export jobs"
ON searchleads_jobs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role full access to export jobs"
ON searchleads_jobs
FOR ALL
USING (true)
WITH CHECK (true);