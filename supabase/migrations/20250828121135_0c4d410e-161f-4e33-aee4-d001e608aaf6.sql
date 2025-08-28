-- 1) Tokens table
create table if not exists public.google_tokens (
  user_id uuid primary key,
  access_token text,
  refresh_token text,
  token_uri text default 'https://oauth2.googleapis.com/token',
  client_id text,
  client_secret text,
  scopes text[],
  expiry timestamptz
);

-- 2) RLS
alter table public.google_tokens enable row level security;

-- 3) Policies
-- Service role (your backend) can upsert anything via service key; no policy needed for service role.
-- Allow authenticated users to read/update ONLY their own row if you ever call PostgREST from the browser (we currently don't).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='google_tokens' and policyname='select_own_google_tokens'
  ) then
    create policy select_own_google_tokens
      on public.google_tokens for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='google_tokens' and policyname='upsert_own_google_tokens'
  ) then
    create policy upsert_own_google_tokens
      on public.google_tokens for insert with check (auth.uid() = user_id);
    
    create policy update_own_google_tokens
      on public.google_tokens for update
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end$$;