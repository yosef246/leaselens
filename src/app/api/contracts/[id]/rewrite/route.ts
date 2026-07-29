/**
 * POST /api/contracts/[id]/rewrite — generate a corrected contract PDF from the user-approved
 * fixes, streaming live progress as Server-Sent Events.
 *
 * Flow (each stage emits an SSE progress frame with a real percentage):
 *   1. load original sections + approved issues        (מנתח סעיפים מקוריים)
 *   2. build the rewrite request                        (משלב תיקונים)
 *   3. Claude rewrite (the long stage)                  (מפרמט וכתיבה מחדש)
 *   4. render PDF (pdf-lib) + upload + sign URL         (יצירת PDF)
 *   -> terminal `done` frame carries the signed PDF URL (valid 1h) + rewrite id.
 *
 * Guarded twice: session required + explicit ownership (getContract), on top of RLS. The PDF is
 * produced in-process (pdf-lib) and stored in the private rewritten-contracts bucket — the
 * contract text never leaves our infrastructure.
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getContract } from "@/lib/db/contracts";
import { listContractChunks } from "@/lib/db/contract-chunks";
import { listContractIssues } from "@/lib/db/contract-issues";
import {
  insertRewrittenContract,
  type AppliedIssue,
} from "@/lib/db/rewritten-contracts";
import { rewriteContract, type OriginalSection, type ApprovedFix } from "@/lib/ai/rewrite-contract";
import { logClaudeUsage } from "@/lib/ai/claude";
import { renderContractPdf } from "@/lib/pdf/render-contract";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SECTIONS = 30; // keep the single Claude call within the 60s duration budget.
const SIGNED_URL_TTL = 3600; // 1 hour.
const BUCKET = "rewritten-contracts";

type SseFrame =
  | { type: "progress"; step: number; label: string; percent: number }
  | { type: "done"; percent: 100; url: string; rewrite_id: string }
  | { type: "error"; message: string };

function sseChunk(frame: SseFrame): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(frame)}\n\n`);
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
  if (!user) {
    return new Response(JSON.stringify({ error: "לא מחובר" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contract = await getContract(user.id, id);
  if (!contract) {
    return new Response(JSON.stringify({ error: "החוזה לא נמצא" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (frame: SseFrame) => controller.enqueue(sseChunk(frame));
      try {
        // ---- Step 1: load original sections + approved fixes ----
        emit({ type: "progress", step: 1, label: "מנתח סעיפים מקוריים", percent: 10 });
        const [chunks, issues] = await Promise.all([
          listContractChunks(user.id, id),
          listContractIssues(user.id, id),
        ]);
        const approved = issues.filter((i) => i.user_approved);
        if (approved.length === 0) {
          emit({ type: "error", message: "לא סומנו תיקונים לאישור. אשר תיקונים לפני יצירת חוזה מתוקן." });
          controller.close();
          return;
        }

        // ---- Step 2: assemble the rewrite request ----
        emit({ type: "progress", step: 2, label: "משלב תיקונים", percent: 30 });
        const originals: OriginalSection[] = chunks
          .slice(0, MAX_SECTIONS)
          .map((c) => ({ section_number: c.section_number, text: c.text }));
        const approvedFixes: ApprovedFix[] = approved.map((i) => ({
          section_number: i.section_number,
          category: i.category,
          suggested_fix: i.suggested_fix,
        }));

        // ---- Step 3: Claude rewrite (the long stage) ----
        emit({ type: "progress", step: 3, label: "מפרמט וכתיבה מחדש", percent: 55 });
        const { document: rewritten, usage } = await rewriteContract(
          contract.title,
          originals,
          approvedFixes
        );
        await logClaudeUsage({ contractId: id, endpoint: "rewrite", usage });

        // ---- Step 4: render PDF, upload, sign ----
        emit({ type: "progress", step: 4, label: "יצירת PDF", percent: 85 });
        const pdfBytes = await renderContractPdf(rewritten);

        const rewriteId = randomUUID();
        const storagePath = `${user.id}/${id}/${rewriteId}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: false });
        if (uploadError) throw new Error(`שמירת ה-PDF נכשלה: ${uploadError.message}`);

        const issuesApplied: AppliedIssue[] = approved.map((i) => ({
          issue_id: i.id,
          section_number: i.section_number,
          category: i.category,
          suggested_fix: i.suggested_fix,
        }));
        await insertRewrittenContract(user.id, {
          id: rewriteId,
          contractId: id,
          pdfPath: storagePath,
          issuesApplied,
        });

        const { data: signed, error: signError } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(storagePath, SIGNED_URL_TTL);
        if (signError || !signed) throw new Error(`יצירת קישור הורדה נכשלה: ${signError?.message}`);

        emit({ type: "done", percent: 100, url: signed.signedUrl, rewrite_id: rewriteId });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "יצירת החוזה המתוקן נכשלה";
        emit({ type: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
