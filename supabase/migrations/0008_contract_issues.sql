-- 0008_contract_issues.sql — proactive problem-clause detection (Ambiguity & Trap Detection).
-- One row per flagged clause found by the /review analysis. 'ok' clauses are NOT stored — only
-- the five problem categories. Mirrors contract_chunks' RLS model: a row is visible/writable only
-- if its parent contract belongs to the caller (auth.uid()).

create table if not exists public.contract_issues (
  id             uuid primary key default gen_random_uuid(),
  contract_id    uuid not null references public.contracts (id) on delete cascade,
  section_number text,
  original_text  text not null,
  category       text not null
                   check (category in ('ambiguous','one-sided','missing-standard','illegal','trap')),
  severity       int  not null check (severity between 1 and 5),
  explanation    text not null,
  suggested_fix  text not null default '',
  law_reference  text,                         -- resolved from the law corpus, e.g. 'חוק השכירות והשאילה §25י'
  user_approved  boolean not null default false,
  created_at     timestamptz not null default now()
);

comment on table public.contract_issues is 'Proactively-detected problematic clauses per contract (review feature). ok clauses are not stored.';

create index if not exists contract_issues_contract_idx
  on public.contract_issues (contract_id, severity desc);

-- ---- RLS: an issue is visible/writable only if its parent contract belongs to the caller. ----
alter table public.contract_issues enable row level security;

drop policy if exists "contract_issues_select_own" on public.contract_issues;
create policy "contract_issues_select_own" on public.contract_issues
  for select using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_issues.contract_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "contract_issues_insert_own" on public.contract_issues;
create policy "contract_issues_insert_own" on public.contract_issues
  for insert with check (
    exists (
      select 1 from public.contracts c
      where c.id = contract_issues.contract_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "contract_issues_update_own" on public.contract_issues;
create policy "contract_issues_update_own" on public.contract_issues
  for update using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_issues.contract_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "contract_issues_delete_own" on public.contract_issues;
create policy "contract_issues_delete_own" on public.contract_issues
  for delete using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_issues.contract_id and c.user_id = auth.uid()
    )
  );
