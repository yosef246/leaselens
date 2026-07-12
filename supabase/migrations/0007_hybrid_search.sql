-- 0007_hybrid_search.sql — hybrid retrieval (vector + keyword) for law_chunks & contract_chunks.
--
-- Why: text-embedding-3-small dilutes large Hebrew sections — e.g. חוק השכירות §25י (the deposit
-- cap) never surfaced by pure vector search, yet it literally contains "ערובה" and "פיקדון".
-- A keyword (tsvector) arm nails those dense sections; we fuse the two rankings with Reciprocal
-- Rank Fusion (RRF). 'simple' text-search config = tokenize + lowercase, no stemming (there is no
-- Postgres Hebrew dictionary) — good enough since Hebrew stemming is hard and the app strips the
-- definite-article prefix and OR-expands synonyms at query build time (src/lib/rag/query.ts).

-- ---- generated tsvector columns + GIN indexes ----
alter table public.law_chunks
  add column if not exists fts tsvector generated always as (to_tsvector('simple', coalesce(text, ''))) stored;
create index if not exists law_chunks_fts_idx on public.law_chunks using gin (fts);

alter table public.contract_chunks
  add column if not exists fts tsvector generated always as (to_tsvector('simple', coalesce(text, ''))) stored;
create index if not exists contract_chunks_fts_idx on public.contract_chunks using gin (fts);

-- ---- law: hybrid, SECURITY DEFINER (global public reference data) ----
create or replace function public.match_law_chunks_hybrid(
  p_query_embedding vector(1536),
  p_query_text      text,
  p_match_count     int default 6,
  p_pool            int default 30,
  p_rrf_k           int default 50
)
returns table (
  id              uuid,
  law_name        text,
  short_title     text,
  law_year        int,
  section_number  text,
  section_title   text,
  chapter         text,
  sign            text,
  amendment       text,
  category        text,
  is_binding      boolean,
  text            text,
  similarity      float,
  keyword_matched boolean,
  rrf_score       float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with vec as (
    select lc.id, row_number() over (order by lc.embedding <=> p_query_embedding) as rnk
    from law_chunks lc
    order by lc.embedding <=> p_query_embedding
    limit p_pool
  ),
  kw as (
    select lc.id, row_number() over (order by ts_rank(lc.fts, q.query) desc) as rnk
    from law_chunks lc, to_tsquery('simple', nullif(p_query_text, '')) as q(query)
    where lc.fts @@ q.query
    order by ts_rank(lc.fts, q.query) desc
    limit p_pool
  ),
  fused as (
    select
      coalesce(vec.id, kw.id) as id,
      coalesce(1.0 / (p_rrf_k + vec.rnk), 0) + coalesce(1.0 / (p_rrf_k + kw.rnk), 0) as rrf,
      (kw.id is not null) as kw_matched
    from vec
    full outer join kw on vec.id = kw.id
  )
  select
    lc.id, lc.law_name, lc.short_title, lc.law_year, lc.section_number, lc.section_title,
    lc.chapter, lc.sign, lc.amendment, lc.category, lc.is_binding, lc.text,
    coalesce(1 - (lc.embedding <=> p_query_embedding), 0) as similarity,
    f.kw_matched as keyword_matched,
    f.rrf as rrf_score
  from fused f
  join law_chunks lc on lc.id = f.id
  order by f.rrf desc
  limit p_match_count;
$$;

-- ---- contract: hybrid, SECURITY INVOKER (RLS enforces owner) ----
create or replace function public.match_contract_chunks_hybrid(
  p_query_embedding vector(1536),
  p_query_text      text,
  p_contract_id     uuid,
  p_match_count     int default 6,
  p_pool            int default 30,
  p_rrf_k           int default 50
)
returns table (
  id              uuid,
  contract_id     uuid,
  section_number  text,
  chunk_index     int,
  text            text,
  similarity      float,
  keyword_matched boolean,
  rrf_score       float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with vec as (
    select cc.id, row_number() over (order by cc.embedding <=> p_query_embedding) as rnk
    from contract_chunks cc
    where cc.contract_id = p_contract_id
    order by cc.embedding <=> p_query_embedding
    limit p_pool
  ),
  kw as (
    select cc.id, row_number() over (order by ts_rank(cc.fts, q.query) desc) as rnk
    from contract_chunks cc, to_tsquery('simple', nullif(p_query_text, '')) as q(query)
    where cc.contract_id = p_contract_id and cc.fts @@ q.query
    order by ts_rank(cc.fts, q.query) desc
    limit p_pool
  ),
  fused as (
    select
      coalesce(vec.id, kw.id) as id,
      coalesce(1.0 / (p_rrf_k + vec.rnk), 0) + coalesce(1.0 / (p_rrf_k + kw.rnk), 0) as rrf,
      (kw.id is not null) as kw_matched
    from vec
    full outer join kw on vec.id = kw.id
  )
  select
    cc.id, cc.contract_id, cc.section_number, cc.chunk_index, cc.text,
    coalesce(1 - (cc.embedding <=> p_query_embedding), 0) as similarity,
    f.kw_matched as keyword_matched,
    f.rrf as rrf_score
  from fused f
  join contract_chunks cc on cc.id = f.id
  order by f.rrf desc
  limit p_match_count;
$$;
