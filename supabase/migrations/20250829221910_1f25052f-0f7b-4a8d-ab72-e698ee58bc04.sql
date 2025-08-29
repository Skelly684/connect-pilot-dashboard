-- Enable pgcrypto if not enabled (for gen_random_uuid)
create extension if not exists pgcrypto;

-- Drop existing google_tokens table to recreate with proper schema
drop table if exists public.google_tokens cascade;

-- 1) Create proper google_tokens table
create table public.google_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google',
  access_token text not null,
  refresh_token text,
  id_token text,
  token_type text,
  scope text,
  expires_at bigint not null,         -- unix seconds
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_tokens_user_provider_uniq unique (user_id, provider)
);

-- 2) Update trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_google_tokens_updated_at on public.google_tokens;
create trigger set_google_tokens_updated_at
before update on public.google_tokens
for each row execute function public.set_updated_at();

-- 3) Indexes
create index if not exists idx_google_tokens_user on public.google_tokens(user_id);
create index if not exists idx_google_tokens_expires_at on public.google_tokens(expires_at);

-- 4) RLS
alter table public.google_tokens enable row level security;

-- Allow the owner to select/update/delete their own rows
drop policy if exists google_tokens_select on public.google_tokens;
create policy google_tokens_select
on public.google_tokens for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists google_tokens_update on public.google_tokens;
create policy google_tokens_update
on public.google_tokens for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists google_tokens_delete on public.google_tokens;
create policy google_tokens_delete
on public.google_tokens for delete
to authenticated
using (auth.uid() = user_id);

-- Allow inserts by the owner (when not using service_role)
drop policy if exists google_tokens_insert on public.google_tokens;
create policy google_tokens_insert
on public.google_tokens for insert
to authenticated
with check (auth.uid() = user_id);