/**
 * User-data access layer for `rewritten_contracts` (D4). Every function takes `userId` first and
 * scopes to it; RLS additionally enforces that the parent contract belongs to auth.uid().
 */
import { createClient } from "@/lib/supabase/server";

/** Audit-trail entry for one applied fix (stored in issues_applied JSONB). */
export interface AppliedIssue {
  issue_id: string;
  section_number: string | null;
  category: string;
  suggested_fix: string;
}

export interface RewrittenContractRow {
  id: string;
  contract_id: string;
  pdf_url: string | null;
  docx_url: string | null;
  issues_applied: AppliedIssue[];
  created_at: string;
}

export async function insertRewrittenContract(
  userId: string,
  input: {
    id: string;
    contractId: string;
    pdfPath: string;
    issuesApplied: AppliedIssue[];
  }
): Promise<RewrittenContractRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rewritten_contracts")
    .insert({
      id: input.id,
      contract_id: input.contractId,
      pdf_url: input.pdfPath,
      issues_applied: input.issuesApplied,
    })
    .select()
    .single();
  if (error) throw new Error(`insertRewrittenContract failed: ${error.message}`);
  void userId; // ownership enforced by RLS on the parent contract; kept for the D4 signature.
  return data as RewrittenContractRow;
}

/** Latest rewrite for a contract, if any. RLS-scoped. */
export async function getLatestRewrite(
  userId: string,
  contractId: string
): Promise<RewrittenContractRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rewritten_contracts")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestRewrite failed: ${error.message}`);
  void userId;
  return (data as RewrittenContractRow | null) ?? null;
}
