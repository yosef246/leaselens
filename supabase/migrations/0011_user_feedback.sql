-- 0011_user_feedback.sql — human feedback on the AI "judge" (issue-detection).
-- The "השופט טעה או פספס משהו?" affordance writes here. Over time this becomes the real-world
-- ground-truth source for building fixtures/annotated-contracts/ (see CLAUDE.md TODO).
--
-- issue_id is nullable + ON DELETE SET NULL on purpose: feedback may be about a MISSING detection
-- (no issue) or a WRONG one (references the flagged issue), and re-running /review deletes+reinserts
-- contract_issues — feedback must SURVIVE that, so it can't cascade-delete with the issue.

create table if not exists public.user_feedback (
  id           uuid primary key default gen_random_uuid(),
  contract_id  uuid not null references public.contracts (id) on delete cascade,
  issue_id     uuid references public.contract_issues (id) on delete set null,
  note         text not null,
  created_at   timestamptz not null default now()
);

comment on table public.user_feedback is 'Human feedback on the AI issue-detection judge. Seed source for a future annotated ground-truth set.';

create index if not exists user_feedback_contract_idx
  on public.user_feedback (contract_id, created_at desc);

alter table public.user_feedback enable row level security;

drop policy if exists "user_feedback_select_own" on public.user_feedback;
create policy "user_feedback_select_own" on public.user_feedback
  for select using (exists (select 1 from public.contracts c
    where c.id = user_feedback.contract_id and c.user_id = auth.uid()));

drop policy if exists "user_feedback_insert_own" on public.user_feedback;
create policy "user_feedback_insert_own" on public.user_feedback
  for insert with check (exists (select 1 from public.contracts c
    where c.id = user_feedback.contract_id and c.user_id = auth.uid()));
