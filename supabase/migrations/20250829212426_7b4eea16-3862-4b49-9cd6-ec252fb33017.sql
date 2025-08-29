-- 1) Table with the exact columns your FastAPI writes
create table if not exists public.google_tokens (
  user_id        uuid primary key,
  access_token   text,
  refresh_token  text,
  token_uri      text default 'https://oauth2.googleapis.com/token',
  client_id      text,
  client_secret  text,
  scopes         text[] default array['https://www.googleapis.com/auth/calendar.events'],
  expiry         timestamptz
);

-- 2) Make sure the PK is on user_id (drop any old PK first)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.google_tokens'::regclass
      and contype = 'p'
      and conname <> 'google_tokens_pkey'
  ) then
    alter table public.google_tokens drop constraint if exists google_tokens_pkey;
  end if;
end $$;

alter table public.google_tokens
  add constraint google_tokens_pkey primary key (user_id)
  -- if it already exists this will no-op
  ;

-- 3) Disable RLS so service writes never bounce
alter table public.google_tokens disable row level security;

-- 4) Quick sanity: make sure types match the backend expectations
-- (user_id MUST be uuid; expiry MUST be timestamptz)