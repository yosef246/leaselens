/**
 * /api/contracts/[id]/review — proactive problem-clause detection.
 *
 *   POST  → analyze every contract section with Claude, persist the flagged ones. Idempotent
 *           (clears prior issues first), so re-running is safe.
 *   PATCH → user edits a suggested fix and/or approves an issue.
 *
 * Guarded twice: a session is required, and the contract must belong to the caller
 * (explicit getContract, on top of RLS).
 *
 * Cost/time note: this fans out one Claude call per section. We cap sections and bound
 * concurrency so a single Vercel invocation stays within maxDuration; large contracts analyze
 * their first MAX_SECTIONS clauses.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getContract } from "@/lib/db/contracts";
import { listContractChunks } from "@/lib/db/contract-chunks";
import {
  deleteIssuesForContract,
  insertContractIssues,
  updateContractIssue,
  type ContractIssueInput,
  type IssueCategory,
} from "@/lib/db/contract-issues";
import { embedTexts } from "@/lib/embeddings/openai";
import { matchLawChunksHybrid } from "@/lib/db/retrieval";
import { buildKeywordQuery } from "@/lib/rag/query";
import { analyzeSection, MAX_REVIEW_SECTIONS, type LawCandidate } from "@/lib/ai/issue-detection";
import { logClaudeUsage } from "@/lib/ai/claude";
import { sumUsage } from "@/lib/ai/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel Hobby caps a function at 60s. Review fans out one Claude call per section, and a single
// generateObject can run ~10-12s — so total time is roughly ceil(MAX_SECTIONS / CONCURRENCY) rounds
// × ~12s. 16/8 = 2 rounds (~25-30s) leaves comfortable headroom. Larger contracts are analyzed to
// their first MAX_SECTIONS sections; full coverage would need request batching or a non-Hobby plan.
const MAX_SECTIONS = MAX_REVIEW_SECTIONS; // 16 — shared with the review page's truncation warning
const CONCURRENCY = 8;
const LAW_K = 4; // law candidates handed to the model per section.

/** Bounded-concurrency map that preserves input order. */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const contract = await getContract(user.id, id);
  if (!contract) return NextResponse.json({ error: "החוזה לא נמצא" }, { status: 404 });
  if (contract.status !== "embedded") {
    return NextResponse.json(
      { error: "החוזה עדיין לא עובד. הרץ ״עבד״ לפני סקירת הסעיפים." },
      { status: 409 }
    );
  }

  const allChunks = await listContractChunks(user.id, id);
  if (allChunks.length === 0) {
    return NextResponse.json({ error: "לא נמצא טקסט לניתוח בחוזה." }, { status: 422 });
  }
  const chunks = allChunks.slice(0, MAX_SECTIONS);

  try {
    const embeddings = await embedTexts(chunks.map((c) => c.text));

    const analyzed = await mapPool(chunks, CONCURRENCY, async (chunk, i) => {
      const lawHits = await matchLawChunksHybrid(
        embeddings[i],
        buildKeywordQuery(chunk.text),
        LAW_K
      );
      const lawCandidates: LawCandidate[] = lawHits.map((h, idx) => ({
        marker: idx + 1,
        label: `${h.short_title} §${h.section_number}`,
        text: h.text,
      }));
      const result = await analyzeSection(chunk.section_number, chunk.text, lawCandidates);
      return { chunk, result };
    });

    const issues: ContractIssueInput[] = analyzed
      .filter(({ result }) => result.category !== "ok")
      .map(({ chunk, result }) => ({
        section_number: chunk.section_number,
        original_text: chunk.text,
        category: result.category as IssueCategory,
        severity: result.severity,
        explanation: result.explanation,
        suggested_fix: result.suggested_fix,
        law_reference: result.law_reference,
      }));

    await deleteIssuesForContract(user.id, id);
    const inserted = await insertContractIssues(user.id, id, issues);

    // One aggregate usage row for the whole review fan-out (one Claude call per section).
    await logClaudeUsage({
      contractId: id,
      endpoint: "review",
      usage: sumUsage(analyzed.map(({ result }) => result.usage)),
    });

    return NextResponse.json(
      { contract_id: id, analyzed: chunks.length, issues: inserted },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "review failed";
    return NextResponse.json({ error: `הסקירה נכשלה: ${message}` }, { status: 500 });
  }
}

const patchSchema = z.object({
  issue_id: z.string().uuid("מזהה בעיה לא תקין"),
  suggested_fix: z.string().max(4000).optional(),
  user_approved: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  // Defense in depth (RLS also scopes the update to the caller's contract).
  const contract = await getContract(user.id, id);
  if (!contract) return NextResponse.json({ error: "החוזה לא נמצא" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" },
      { status: 400 }
    );
  }

  const { issue_id, suggested_fix, user_approved } = parsed.data;
  if (suggested_fix === undefined && user_approved === undefined) {
    return NextResponse.json({ error: "אין מה לעדכן" }, { status: 400 });
  }

  try {
    await updateContractIssue(user.id, issue_id, { suggested_fix, user_approved });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "update failed";
    return NextResponse.json({ error: `העדכון נכשל: ${message}` }, { status: 500 });
  }
}
