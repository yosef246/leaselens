/**
 * Vector retrieval helpers (D4-adjacent): thin wrappers over the match_* RPCs (migration 0006).
 * Both run on the request-scoped server client so the caller's session drives RLS on the
 * contract side; the law side is a SECURITY DEFINER RPC over global reference data.
 */
import { createClient } from "@/lib/supabase/server";

export interface LawHitRow {
  id: string;
  law_name: string;
  short_title: string;
  law_year: number;
  section_number: string;
  section_title: string | null;
  chapter: string | null;
  sign: string | null;
  amendment: string | null;
  category: string;
  is_binding: boolean;
  text: string;
  similarity: number;
  keyword_matched?: boolean;
  rrf_score?: number;
}

export interface ContractHitRow {
  id: string;
  contract_id: string;
  section_number: string | null;
  chunk_index: number;
  text: string;
  similarity: number;
  keyword_matched?: boolean;
  rrf_score?: number;
}

export async function matchLawChunks(
  queryEmbedding: number[],
  matchCount: number
): Promise<LawHitRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_law_chunks", {
    p_query_embedding: queryEmbedding,
    p_match_count: matchCount,
  });
  if (error) throw new Error(`matchLawChunks failed: ${error.message}`);
  return (data ?? []) as LawHitRow[];
}

export async function matchContractChunks(
  userId: string,
  contractId: string,
  queryEmbedding: number[],
  matchCount: number
): Promise<ContractHitRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_contract_chunks", {
    p_query_embedding: queryEmbedding,
    p_contract_id: contractId,
    p_match_count: matchCount,
  });
  if (error) throw new Error(`matchContractChunks failed: ${error.message}`);
  void userId; // ownership enforced by RLS (INVOKER); kept for the D4 signature.
  return (data ?? []) as ContractHitRow[];
}

// ---- Hybrid (vector + keyword RRF, migration 0007) — the retrieval used by /ask ----

export async function matchLawChunksHybrid(
  queryEmbedding: number[],
  queryText: string,
  matchCount: number
): Promise<LawHitRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_law_chunks_hybrid", {
    p_query_embedding: queryEmbedding,
    p_query_text: queryText,
    p_match_count: matchCount,
  });
  if (error) throw new Error(`matchLawChunksHybrid failed: ${error.message}`);
  return (data ?? []) as LawHitRow[];
}

export async function matchContractChunksHybrid(
  userId: string,
  contractId: string,
  queryEmbedding: number[],
  queryText: string,
  matchCount: number
): Promise<ContractHitRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_contract_chunks_hybrid", {
    p_query_embedding: queryEmbedding,
    p_query_text: queryText,
    p_contract_id: contractId,
    p_match_count: matchCount,
  });
  if (error) throw new Error(`matchContractChunksHybrid failed: ${error.message}`);
  void userId; // ownership enforced by RLS (INVOKER); kept for the D4 signature.
  return (data ?? []) as ContractHitRow[];
}
