-- Google OAuth tokens (per user)
create table if not exists public.google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text,
  refresh_token text,
  token_uri text default 'https://oauth2.googleapis.com/token',
  client_id text,
  client_secret text,
  scopes text[],
  expiry timestamptz
);

-- Enable RLS
alter table public.google_tokens enable row level security;

-- RLS policies for users to read their own tokens
do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'google_tokens_self_read'
  ) then
    create policy google_tokens_self_read
      on public.google_tokens
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'google_tokens_self_upsert'
  ) then
    create policy google_tokens_self_upsert
      on public.google_tokens
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;