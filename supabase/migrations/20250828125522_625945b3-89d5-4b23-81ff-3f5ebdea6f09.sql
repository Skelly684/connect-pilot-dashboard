-- === 0) Helpful timestamp trigger ===
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- === 1) OAuth tokens (per user) ===
create table if not exists public.google_oauth_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,                              -- auth.users.id
  provider      text not null default 'google',             -- future proof
  access_token  text not null,
  refresh_token text,                                       -- may be null if Google didn't return it
  expires_at    timestamptz not null,                       -- when access_token expires
  scope         text,                                       -- space-separated scopes
  token_type    text default 'Bearer',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);

create trigger google_oauth_tokens_set_updated_at
before update on public.google_oauth_tokens
for each row execute function set_updated_at();

-- RLS: users only see/write their own token row
alter table public.google_oauth_tokens enable row level security;

create policy "read own token"
on public.google_oauth_tokens
for select using (auth.uid() = user_id);

create policy "insert own token"
on public.google_oauth_tokens
for insert with check (auth.uid() = user_id);

create policy "update own token"
on public.google_oauth_tokens
for update using (auth.uid() = user_id);

-- === 2) OAuth state (anti-CSRF + return path) ===
create table if not exists public.google_oauth_states (
  state         text primary key,               -- random string we issue to the browser
  user_id       uuid not null,
  redirect_path text default '/calendar',       -- where to return inside the app after success
  created_at    timestamptz not null default now()
);

alter table public.google_oauth_states enable row level security;

create policy "state read/write own"
on public.google_oauth_states
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_google_oauth_states_created_at on public.google_oauth_states(created_at);

-- === 3) Connected calendars (per user) ===
create table if not exists public.google_calendars (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  calendar_id   text not null,           -- e.g. primary or someone@domain.com
  summary       text,                    -- calendar name
  time_zone     text,
  access_role   text,                    -- owner/editor/reader
  is_primary    boolean default false,
  is_selected   boolean default true,    -- which calendar we show/use by default
  color         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, calendar_id)
);

create trigger google_calendars_set_updated_at
before update on public.google_calendars
for each row execute function set_updated_at();

alter table public.google_calendars enable row level security;

create policy "read own calendars"
on public.google_calendars
for select using (auth.uid() = user_id);

create policy "write own calendars"
on public.google_calendars
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- === 4) (Optional) Meetings we book from the dashboard ===
create table if not exists public.calendar_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  lead_id         uuid,                  -- link back to your leads table
  google_event_id text,                  -- returned by Google
  calendar_id     text not null,         -- which calendar it's on
  title           text not null,
  description     text,
  start_time      timestamptz not null,
  end_time        timestamptz not null,
  location        text,
  meeting_link    text,                  -- Google Meet link if any
  status          text default 'confirmed', -- confirmed | canceled
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row execute function set_updated_at();

alter table public.calendar_events enable row level security;

create policy "read own events"
on public.calendar_events
for select using (auth.uid() = user_id);

create policy "write own events"
on public.calendar_events
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);