-- 0002_profiles.sql — user profiles linked 1:1 to auth.users, auto-populated on signup.
-- Official Supabase pattern: https://supabase.com/docs/guides/auth/managing-user-data
-- This is the app's canonical "who is this user" table. Future user-data tables
-- (contracts, contract_chunks, red_flags — P5) will FK to profiles(id) / auth.users(id).

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth.users user; created by the on_auth_user_created trigger.';

-- ---- Row Level Security: a user sees and edits only their own profile. ----
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No INSERT policy: rows are created only by the SECURITY DEFINER trigger below,
-- which bypasses RLS. Users cannot hand-insert profiles.

-- ---- Trigger: create a profile row for every new auth.users user. ----
-- SECURITY DEFINER + empty search_path is the hardened Supabase pattern (prevents
-- search_path hijacking; fully-qualify every object).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
