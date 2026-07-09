-- 0003_contracts.sql — one row per uploaded rental contract, owner-scoped (D4).
-- User data: RLS deny-all except the owner (auth.uid() = user_id) on every operation.

create table if not exists public.contracts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  storage_path text not null unique,
  status       text not null default 'uploaded'
                 check (status in ('uploaded', 'parsing', 'parsed', 'embedded', 'failed')),
  created_at   timestamptz not null default now()
);

comment on table public.contracts is 'Uploaded rental contracts. storage_path = <user_id>/<contract_id>.pdf in the private "contracts" bucket.';

create index if not exists contracts_user_created_idx
  on public.contracts (user_id, created_at desc);

-- ---- Row Level Security: owner-only, all operations. ----
alter table public.contracts enable row level security;

drop policy if exists "contracts_select_own" on public.contracts;
create policy "contracts_select_own" on public.contracts
  for select using (auth.uid() = user_id);

drop policy if exists "contracts_insert_own" on public.contracts;
create policy "contracts_insert_own" on public.contracts
  for insert with check (auth.uid() = user_id);

drop policy if exists "contracts_update_own" on public.contracts;
create policy "contracts_update_own" on public.contracts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "contracts_delete_own" on public.contracts;
create policy "contracts_delete_own" on public.contracts
  for delete using (auth.uid() = user_id);
