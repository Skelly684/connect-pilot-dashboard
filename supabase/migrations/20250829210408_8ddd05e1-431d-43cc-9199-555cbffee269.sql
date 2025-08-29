-- Make user_id the primary key on google_tokens table
ALTER TABLE public.google_tokens ADD PRIMARY KEY (user_id);

-- Add service role full access policy
CREATE POLICY "service role full access" 
ON public.google_tokens 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);