-- 0005_contract_chunks.sql — per-contract text chunks + embeddings (P2).
-- Mirrors law_chunks (same model: text-embedding-3-small, vector(1536), HNSW cosine) so
-- contract chunks and law chunks share one comparable vector space for cross-retrieval (P3).
-- pgvector is already enabled by 0001_law_chunks.sql.

create table if not exists public.contract_chunks (
  id             uuid primary key default gen_random_uuid(),
  contract_id    uuid not null references public.contracts (id) on delete cascade,
  section_number text,
  text           text not null,
  chunk_index    int not null,
  embedding      vector(1536),
  created_at     timestamptz not null default now(),
  unique (contract_id, chunk_index)
);

comment on table public.contract_chunks is 'Chunked + embedded text of an uploaded contract. Same embedding model/dims as law_chunks.';

create index if not exists contract_chunks_contract_idx
  on public.contract_chunks (contract_id, chunk_index);

-- HNSW cosine index (matches law_chunks). Built even while empty; fills as rows arrive.
create index if not exists contract_chunks_embedding_hnsw
  on public.contract_chunks using hnsw (embedding vector_cosine_ops);

-- ---- RLS: a chunk is visible only if its parent contract belongs to the caller. ----
alter table public.contract_chunks enable row level security;

drop policy if exists "contract_chunks_select_own" on public.contract_chunks;
create policy "contract_chunks_select_own" on public.contract_chunks
  for select using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_chunks.contract_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "contract_chunks_insert_own" on public.contract_chunks;
create policy "contract_chunks_insert_own" on public.contract_chunks
  for insert with check (
    exists (
      select 1 from public.contracts c
      where c.id = contract_chunks.contract_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "contract_chunks_delete_own" on public.contract_chunks;
create policy "contract_chunks_delete_own" on public.contract_chunks
  for delete using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_chunks.contract_id and c.user_id = auth.uid()
    )
  );
