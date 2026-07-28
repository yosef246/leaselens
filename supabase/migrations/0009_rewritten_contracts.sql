-- 0009_rewritten_contracts.sql — AI-rewritten ("corrected") contracts (Contract Rewriter feature).
-- One row per generated rewrite of a source contract. The generated PDF lives in a new private
-- Storage bucket; the row keeps the storage path + an audit trail of which issues were applied.

create table if not exists public.rewritten_contracts (
  id             uuid primary key default gen_random_uuid(),
  contract_id    uuid not null references public.contracts (id) on delete cascade,
  pdf_url        text,                         -- storage path in the rewritten-contracts bucket
  docx_url       text,                         -- reserved (DOCX export deferred); nullable
  issues_applied jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);

comment on table public.rewritten_contracts is 'AI-generated corrected contracts. pdf_url is a storage path; issues_applied is the audit trail of applied fixes.';

create index if not exists rewritten_contracts_contract_idx
  on public.rewritten_contracts (contract_id, created_at desc);

-- ---- RLS: a rewrite is visible/writable only if its parent contract belongs to the caller. ----
alter table public.rewritten_contracts enable row level security;

drop policy if exists "rewritten_contracts_select_own" on public.rewritten_contracts;
create policy "rewritten_contracts_select_own" on public.rewritten_contracts
  for select using (exists (select 1 from public.contracts c
    where c.id = rewritten_contracts.contract_id and c.user_id = auth.uid()));

drop policy if exists "rewritten_contracts_insert_own" on public.rewritten_contracts;
create policy "rewritten_contracts_insert_own" on public.rewritten_contracts
  for insert with check (exists (select 1 from public.contracts c
    where c.id = rewritten_contracts.contract_id and c.user_id = auth.uid()));

drop policy if exists "rewritten_contracts_delete_own" on public.rewritten_contracts;
create policy "rewritten_contracts_delete_own" on public.rewritten_contracts
  for delete using (exists (select 1 from public.contracts c
    where c.id = rewritten_contracts.contract_id and c.user_id = auth.uid()));

-- ---- Private Storage bucket for the generated PDFs. Path: <user_id>/<contract_id>/<rewrite_id>.pdf ----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rewritten-contracts', 'rewritten-contracts', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "rewritten_objects_select_own" on storage.objects;
create policy "rewritten_objects_select_own" on storage.objects
  for select using (
    bucket_id = 'rewritten-contracts' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "rewritten_objects_insert_own" on storage.objects;
create policy "rewritten_objects_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'rewritten-contracts' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "rewritten_objects_delete_own" on storage.objects;
create policy "rewritten_objects_delete_own" on storage.objects
  for delete using (
    bucket_id = 'rewritten-contracts' and (storage.foldername(name))[1] = auth.uid()::text
  );
