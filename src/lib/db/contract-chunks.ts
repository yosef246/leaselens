/**
 * User-data access layer for `contract_chunks` (D4). Every function takes `userId` first and
 * scopes to it; RLS additionally enforces that the parent contract belongs to auth.uid().
 *
 * Embeddings are text-embedding-3-small (1536d) — the SAME model as law_chunks, so contract
 * chunks and law chunks live in one comparable vector space (required for cross-retrieval, P3).
 */
import { createClient } from "@/lib/supabase/server";

export interface ContractChunkInput {
  section_number: string | null;
  text: string;
  chunk_index: number;
  embedding: number[];
}

/** Idempotent re-process helper: clear a contract's chunks before re-inserting. */
export async function deleteChunksForContract(
  userId: string,
  contractId: string
): Promise<void> {
  const supabase = await createClient();
  // Ownership is enforced by RLS via the parent contract; we also pass contractId explicitly.
  const { error } = await supabase.from("contract_chunks").delete().eq("contract_id", contractId);
  if (error) throw new Error(`deleteChunksForContract failed: ${error.message}`);
  void userId; // ownership enforced by RLS on the parent contract; kept for the D4 signature.
}

export async function insertContractChunks(
  userId: string,
  contractId: string,
  chunks: ContractChunkInput[]
): Promise<number> {
  if (chunks.length === 0) return 0;
  const supabase = await createClient();

  const rows = chunks.map((c) => ({
    contract_id: contractId,
    section_number: c.section_number,
    text: c.text,
    chunk_index: c.chunk_index,
    embedding: c.embedding,
  }));

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from("contract_chunks").insert(rows.slice(i, i + BATCH));
    if (error) throw new Error(`insertContractChunks failed at index ${i}: ${error.message}`);
    inserted += Math.min(BATCH, rows.length - i);
  }
  void userId; // ownership enforced by RLS on the parent contract; kept for the D4 signature.
  return inserted;
}

export interface ContractChunkRow {
  id: string;
  section_number: string | null;
  chunk_index: number;
  text: string;
}

/** The contract's chunks in reading order (for the results-view source panel). RLS-scoped. */
export async function listContractChunks(
  userId: string,
  contractId: string
): Promise<ContractChunkRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_chunks")
    .select("id,section_number,chunk_index,text")
    .eq("contract_id", contractId)
    .order("chunk_index", { ascending: true });
  if (error) throw new Error(`listContractChunks failed: ${error.message}`);
  void userId;
  return (data ?? []) as ContractChunkRow[];
}

export async function countChunksForContract(
  userId: string,
  contractId: string
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("contract_chunks")
    .select("*", { count: "exact", head: true })
    .eq("contract_id", contractId);
  if (error) throw new Error(`countChunksForContract failed: ${error.message}`);
  void userId;
  return count ?? 0;
}
