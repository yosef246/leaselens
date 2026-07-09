/**
 * User-data access layer for `contracts` (D4, see docs/DECISIONS.md).
 *
 * D4 contract: every function takes `userId` as its FIRST parameter and scopes all
 * queries to it. This runs on the request-scoped SSR server client, so Postgres RLS
 * ALSO enforces auth.uid() = user_id — the explicit userId here is defense-in-depth and
 * makes ownership obvious at the call site. Never import a raw supabase client to touch
 * user tables outside this layer.
 */
import { createClient } from "@/lib/supabase/server";

export type ContractStatus =
  | "uploaded"
  | "parsing"
  | "parsed"
  | "embedded"
  | "failed";

export interface ContractRow {
  id: string;
  user_id: string;
  title: string;
  storage_path: string;
  status: ContractStatus;
  created_at: string;
}

export async function insertContract(
  userId: string,
  input: { id: string; title: string; storagePath: string }
): Promise<ContractRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .insert({
      id: input.id,
      user_id: userId,
      title: input.title,
      storage_path: input.storagePath,
    })
    .select()
    .single();

  if (error) throw new Error(`insertContract failed: ${error.message}`);
  return data as ContractRow;
}

export async function listContracts(userId: string): Promise<ContractRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listContracts failed: ${error.message}`);
  return (data ?? []) as ContractRow[];
}
