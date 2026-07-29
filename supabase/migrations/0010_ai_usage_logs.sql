-- 0010_ai_usage_logs.sql — telemetry for Claude API usage + prompt-caching savings.
-- One row per Claude call (ask / review / rewrite). Lets the owner see, in real time, how many
-- input tokens were served from cache vs paid at full price, and the estimated cost.
-- RLS mirrors the rest of the schema: a log is visible/insertable only via its parent contract.

create table if not exists public.ai_usage_logs (
  id                     uuid primary key default gen_random_uuid(),
  contract_id            uuid not null references public.contracts (id) on delete cascade,
  endpoint               text not null check (endpoint in ('ask','review','rewrite')),
  model                  text not null,
  input_tokens           int  not null default 0,   -- new tokens, full price
  cache_creation_tokens  int  not null default 0,   -- written to cache (~1.25x)
  cache_read_tokens      int  not null default 0,   -- served from cache (~0.1x)
  output_tokens          int  not null default 0,
  estimated_cost_usd     numeric(12,6) not null default 0,
  cache_hit_ratio        numeric(5,4)  not null default 0,  -- cache_read / total input tokens
  created_at             timestamptz not null default now()
);

comment on table public.ai_usage_logs is 'Per-call Claude usage + prompt-caching metrics. cache_hit_ratio = cache_read / (input + cache_creation + cache_read).';

create index if not exists ai_usage_logs_contract_idx
  on public.ai_usage_logs (contract_id, created_at desc);

alter table public.ai_usage_logs enable row level security;

drop policy if exists "ai_usage_logs_select_own" on public.ai_usage_logs;
create policy "ai_usage_logs_select_own" on public.ai_usage_logs
  for select using (exists (select 1 from public.contracts c
    where c.id = ai_usage_logs.contract_id and c.user_id = auth.uid()));

drop policy if exists "ai_usage_logs_insert_own" on public.ai_usage_logs;
create policy "ai_usage_logs_insert_own" on public.ai_usage_logs
  for insert with check (exists (select 1 from public.contracts c
    where c.id = ai_usage_logs.contract_id and c.user_id = auth.uid()));
