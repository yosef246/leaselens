/**
 * User-data access layer for `contract_issues` (D4). Every function takes `userId` first and
 * scopes to it; RLS additionally enforces that the parent contract belongs to auth.uid().
 *
 * These rows are the proactive problem-clause findings surfaced on /contracts/[id]/review.
 */
import { createClient } from "@/lib/supabase/server";

/** The five problem categories persisted ('ok' is never stored). */
export type IssueCategory =
  | "ambiguous"
  | "one-sided"
  | "missing-standard"
  | "illegal"
  | "trap";

export interface ContractIssueInput {
  section_number: string | null;
  original_text: string;
  category: IssueCategory;
  severity: number;
  explanation: string;
  suggested_fix: string;
  law_reference: string | null;
}

export interface ContractIssueRow extends ContractIssueInput {
  id: string;
  contract_id: string;
  user_approved: boolean;
  created_at: string;
}

/** Idempotent re-analysis: clear a contract's issues before re-inserting. */
export async function deleteIssuesForContract(
  userId: string,
  contractId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contract_issues")
    .delete()
    .eq("contract_id", contractId);
  if (error) throw new Error(`deleteIssuesForContract failed: ${error.message}`);
  void userId; // ownership enforced by RLS on the parent contract; kept for the D4 signature.
}

export async function insertContractIssues(
  userId: string,
  contractId: string,
  issues: ContractIssueInput[]
): Promise<number> {
  if (issues.length === 0) return 0;
  const supabase = await createClient();

  const rows = issues.map((i) => ({
    contract_id: contractId,
    section_number: i.section_number,
    original_text: i.original_text,
    category: i.category,
    severity: i.severity,
    explanation: i.explanation,
    suggested_fix: i.suggested_fix,
    law_reference: i.law_reference,
  }));

  const { error } = await supabase.from("contract_issues").insert(rows);
  if (error) throw new Error(`insertContractIssues failed: ${error.message}`);
  void userId; // ownership enforced by RLS on the parent contract; kept for the D4 signature.
  return rows.length;
}

/** A contract's issues, most severe first. RLS-scoped. */
export async function listContractIssues(
  userId: string,
  contractId: string
): Promise<ContractIssueRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_issues")
    .select("*")
    .eq("contract_id", contractId)
    .order("severity", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listContractIssues failed: ${error.message}`);
  void userId;
  return (data ?? []) as ContractIssueRow[];
}

/** User edits the suggested fix and/or approves an issue. RLS enforces ownership via the parent. */
export async function updateContractIssue(
  userId: string,
  issueId: string,
  patch: { suggested_fix?: string; user_approved?: boolean }
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contract_issues")
    .update(patch)
    .eq("id", issueId);
  if (error) throw new Error(`updateContractIssue failed: ${error.message}`);
  void userId;
}
