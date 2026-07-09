-- ============================================================================
-- 0001_law_chunks.sql
-- P1 (Law corpus) migration: pgvector extension, law_chunks table, HNSW index,
-- match_law_chunks RPC.
--
-- Extends the law_chunks shape sketched in docs/ARCHITECTURE.md §3 with columns required by
-- docs/DECISIONS.md D1-AMENDED (11-law, manifest-driven corpus):
--   - short_title   : manifest.short_title (e.g. 'חוק הגנת הדייר')
--   - chapter, sign : enclosing פרק / סימן context captured by hebrew-law-chunker.ts
--   - amendment     : the raw "[תיקון: ...]" marker captured per section, if any
-- These four columns are additive vs. ARCHITECTURE.md's original sketch and are called out in
-- the backend-developer's closing report as a flagged, additive schema deviation (nullable /
-- non-breaking; law_year/section_number/category/is_binding/text/embedding match the original
-- spec exactly).
--
-- Apply with the Supabase CLI (owner-run, not part of this script):
--   supabase db push
-- or paste this file into the Supabase SQL editor.
-- ============================================================================

create extension if not exists vector;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ============================================================
-- law_chunks
-- ============================================================
create table if not exists law_chunks (
  id             uuid primary key default gen_random_uuid(),
  law_name       text not null,        -- full title, e.g. 'חוק הגנת הדייר [נוסח משולב]' (manifest.title)
  short_title    text not null,        -- e.g. 'חוק הגנת הדייר' (manifest.short_title)
  law_year       int not null,         -- Gregorian year (manifest.year)
  section_number text not null,        -- e.g. '9', '14א', '25יד' -- text, not int: Hebrew-letter suffixes
  section_title  text,                 -- nullable: some sections carry no separate title
  chapter        text,                 -- enclosing פרק heading, context metadata only, nullable
  sign           text,                 -- enclosing סימן heading, context metadata only, nullable
  amendment      text,                 -- raw contents of a trailing "[תיקון: ...]" marker, nullable
  category       text not null,        -- from manifest.category; D6: src/lib/laws/mapping.ts is the
                                        -- ONLY place in app code that derives this value
  is_binding     boolean not null default true,
  text           text not null,
  embedding      vector(1536) not null, -- text-embedding-3-small
  created_at     timestamptz not null default now(),
  unique (law_name, section_number)     -- required for idempotent embed-laws.ts upsert
);

-- HNSW chosen over IVFFlat for the same reason as contract_chunks (docs/ARCHITECTURE.md §3):
-- no pre-training-set requirement, and rows are populated incrementally (per-law) rather than
-- all-at-once. Requires pgvector >= 0.5.0 (Supabase-managed Postgres ships this by default).
create index if not exists law_chunks_embedding_idx
  on law_chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index if not exists law_chunks_law_name_idx on law_chunks (law_name);
create index if not exists law_chunks_category_idx on law_chunks (category);

-- ============================================================
-- Row-Level Security — defense in depth (see docs/ARCHITECTURE.md §3/§4 for the enforcement model)
-- ============================================================
alter table law_chunks enable row level security;
-- Deliberately NO permissive policies. law_chunks has no user_id column at all -- it is global,
-- unscoped reference data. The only writer is the service-role build script
-- (scripts/embed-laws.ts via src/lib/supabase/admin.ts), which bypasses RLS entirely (Postgres/
-- Supabase default for the service role). If the anon/publishable key is ever used directly, RLS
-- defaults to deny-all here, failing closed rather than open.

-- ============================================================
-- RPC: match_law_chunks
-- ============================================================
create or replace function match_law_chunks(
  p_query_embedding vector(1536),
  p_match_count     int default 2
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
language sql stable
as $$
  select
    lc.id, lc.law_name, lc.short_title, lc.law_year, lc.section_number, lc.section_title,
    lc.chapter, lc.sign, lc.amendment, lc.category, lc.is_binding, lc.text,
    1 - (lc.embedding <=> p_query_embedding) as similarity
  from law_chunks lc
  order by lc.embedding <=> p_query_embedding
  limit p_match_count;
$$;
