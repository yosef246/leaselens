-- 0006_match_contract_chunks.sql — retrieval RPCs for the ask endpoint (P3).
--
-- Two mirrors of the P1 match_law_chunks shape, with the right security model for each source:
--
--  • match_law_chunks     → SECURITY DEFINER. law_chunks is global public reference data with
--    RLS enabled and DENY-ALL (0001): an authenticated user reading the table directly gets
--    nothing. DEFINER lets this one function expose read-only similarity matches to any signed-in
--    user WITHOUT opening the table to arbitrary reads. (Recreated here to flip it to DEFINER.)
--
--  • match_contract_chunks → SECURITY INVOKER. contract_chunks is user data; INVOKER means the
--    caller's RLS (0005: owner-only via EXISTS on contracts) applies, so a user can only ever
--    retrieve chunks of a contract they own — even if they pass someone else's contract_id.
--
-- set search_path pins schema resolution (law_chunks/contract_chunks in public, the <=> operator
-- from pgvector in extensions) so the functions don't depend on the caller's search_path.

-- ---- law: global, DEFINER ----
create or replace function public.match_law_chunks(
  p_query_embedding vector(1536),
  p_match_count     int default 6
)
returns table (
  id             uuid,
  law_name       text,
  short_title    text,
  law_year       int,
  section_number text,
  section_title  text,
  chapter        text,
  sign           text,
  amendment      text,
  category       text,
  is_binding     boolean,
  text           text,
  similarity     float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    lc.id, lc.law_name, lc.short_title, lc.law_year, lc.section_number, lc.section_title,
    lc.chapter, lc.sign, lc.amendment, lc.category, lc.is_binding, lc.text,
    1 - (lc.embedding <=> p_query_embedding) as similarity
  from law_chunks lc
  order by lc.embedding <=> p_query_embedding
  limit p_match_count;
$$;

-- ---- contract: owner-scoped, INVOKER (RLS enforces ownership) ----
create or replace function public.match_contract_chunks(
  p_query_embedding vector(1536),
  p_contract_id     uuid,
  p_match_count     int default 6
)
returns table (
  id             uuid,
  contract_id    uuid,
  section_number text,
  chunk_index    int,
  text           text,
  similarity     float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    cc.id, cc.contract_id, cc.section_number, cc.chunk_index, cc.text,
    1 - (cc.embedding <=> p_query_embedding) as similarity
  from contract_chunks cc
  where cc.contract_id = p_contract_id
  order by cc.embedding <=> p_query_embedding
  limit p_match_count;
$$;
