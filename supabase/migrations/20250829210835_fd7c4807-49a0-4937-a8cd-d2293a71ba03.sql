-- Drop the existing table and recreate it with the exact schema requested
DROP TABLE IF EXISTS public.google_tokens CASCADE;

-- 1) Create the table with the exact schema
CREATE TABLE public.google_tokens (
  user_id uuid PRIMARY KEY,
  access_token text,
  refresh_token text,
  token_uri text DEFAULT 'https://oauth2.googleapis.com/token',
  client_id text,
  client_secret text,
  scopes text[] DEFAULT ARRAY['https://www.googleapis.com/auth/calendar.events']::text[],
  expiry timestamptz
);

-- 2) Enable RLS
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- 3) Policy: allow full access to service_role (the backend key)
DROP POLICY IF EXISTS "service role full access" ON public.google_tokens;
CREATE POLICY "service role full access"
ON public.google_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);