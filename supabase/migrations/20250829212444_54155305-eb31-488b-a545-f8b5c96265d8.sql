-- Drop existing table and recreate with correct schema
drop table if exists public.google_tokens;

-- 1) Create table with the exact columns your FastAPI writes
create table public.google_tokens (
  user_id        uuid primary key,
  access_token   text,
  refresh_token  text,
  token_uri      text default 'https://oauth2.googleapis.com/token',
  client_id      text,
  client_secret  text,
  scopes         text[] default array['https://www.googleapis.com/auth/calendar.events'],
  expiry         timestamptz
);

-- 2) Disable RLS so service writes never bounce
alter table public.google_tokens disable row level security;