/**
 * Insert layer for `user_feedback` (D4). RLS scopes the write to the caller via the parent
 * contract. This is the collection point for the future ground-truth fixture (see CLAUDE.md).
 */
import { createClient } from "@/lib/supabase/server";

export async function insertUserFeedback(
  userId: string,
  input: { contractId: string; issueId?: string | null; note: string }
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("user_feedback").insert({
    contract_id: input.contractId,
    issue_id: input.issueId ?? null,
    note: input.note,
  });
  if (error) throw new Error(`insertUserFeedback failed: ${error.message}`);
  void userId; // ownership enforced by RLS on the parent contract; kept for the D4 signature.
}
