-- AlgoSleuth secure evidence schema
-- Run this in Supabase SQL Editor (as postgres)

create extension if not exists "pgcrypto";

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  code text not null,
  ai_response text not null,
  level text not null,
  visualization text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

alter table public.cases add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.cases alter column user_id set default auth.uid();

create index if not exists cases_user_id_idx on public.cases(user_id);
create index if not exists cases_created_at_idx on public.cases(created_at desc);

create table if not exists public.case_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  role text not null check (role in ('user', 'model')),
  text text not null,
  is_initial boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists case_messages_case_id_idx on public.case_messages(case_id);
create index if not exists case_messages_created_at_idx on public.case_messages(created_at asc);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.cases enable row level security;
alter table public.case_messages enable row level security;
alter table public.profiles enable row level security;

-- Enforce RLS for all access paths
alter table public.cases force row level security;
alter table public.case_messages force row level security;
alter table public.profiles force row level security;

-- Remove permissive/open policies if they exist
-- cases
 drop policy if exists cases_select_public on public.cases;
 drop policy if exists cases_insert_public on public.cases;
 drop policy if exists cases_update_public on public.cases;
 drop policy if exists cases_delete_public on public.cases;

-- case_messages
 drop policy if exists case_messages_select_public on public.case_messages;
 drop policy if exists case_messages_insert_public on public.case_messages;
 drop policy if exists case_messages_update_public on public.case_messages;
 drop policy if exists case_messages_delete_public on public.case_messages;

-- profiles
 drop policy if exists profiles_select_public on public.profiles;
 drop policy if exists profiles_insert_public on public.profiles;
 drop policy if exists profiles_update_public on public.profiles;
 drop policy if exists profiles_delete_public on public.profiles;

-- Drop previous owner-scoped policies so script can be re-run
drop policy if exists cases_select_own on public.cases;
drop policy if exists cases_insert_own on public.cases;
drop policy if exists cases_update_own on public.cases;
drop policy if exists cases_delete_own on public.cases;

drop policy if exists case_messages_select_own on public.case_messages;
drop policy if exists case_messages_insert_own on public.case_messages;
drop policy if exists case_messages_update_own on public.case_messages;
drop policy if exists case_messages_delete_own on public.case_messages;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

-- Per-user policies for cases
create policy cases_select_own
on public.cases
for select
to authenticated
using (auth.uid() = user_id);

create policy cases_insert_own
on public.cases
for insert
to authenticated
with check (auth.uid() = user_id);

create policy cases_update_own
on public.cases
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy cases_delete_own
on public.cases
for delete
to authenticated
using (auth.uid() = user_id);

-- Per-user policies for case_messages
create policy case_messages_select_own
on public.case_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.cases c
    where c.id = case_messages.case_id
      and c.user_id = auth.uid()
  )
);

create policy case_messages_insert_own
on public.case_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.cases c
    where c.id = case_messages.case_id
      and c.user_id = auth.uid()
  )
);

create policy case_messages_update_own
on public.case_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.cases c
    where c.id = case_messages.case_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.cases c
    where c.id = case_messages.case_id
      and c.user_id = auth.uid()
  )
);

create policy case_messages_delete_own
on public.case_messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.cases c
    where c.id = case_messages.case_id
      and c.user_id = auth.uid()
  )
);

-- Profiles are private to the owner
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy profiles_delete_own
on public.profiles
for delete
to authenticated
using (auth.uid() = user_id);
