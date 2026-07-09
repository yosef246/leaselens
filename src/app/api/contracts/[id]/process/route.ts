/**
 * POST /api/contracts/[id]/process — parse → chunk → embed a previously-uploaded contract.
 *
 * Guarded twice: (1) a session is required, (2) the contract must belong to the caller
 * (explicit getContract(userId, id), on top of RLS) — this endpoint is public-facing.
 *
 * Status walk (each persisted so the UI can poll): uploaded → parsing → parsed → embedded,
 * or → failed on any error. Idempotent: re-processing clears prior chunks first, so retry
 * after a failure is safe.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getContract,
  updateContractStatus,
} from "@/lib/db/contracts";
import {
  deleteChunksForContract,
  insertContractChunks,
} from "@/lib/db/contract-chunks";
import {
  extractPdfText,
  isLikelyScanned,
  SCANNED_ERROR_MESSAGE,
} from "@/lib/pdf/extract";
import { chunkContract } from "@/lib/chunking/contract-chunker";
import { embedTexts } from "@/lib/embeddings/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  // Explicit ownership check (belt-and-suspenders with RLS).
  const contract = await getContract(user.id, id);
  if (!contract) {
    return NextResponse.json({ error: "החוזה לא נמצא" }, { status: 404 });
  }

  try {
    await updateContractStatus(user.id, id, "parsing");

    const { data: blob, error: downloadError } = await supabase.storage
      .from("contracts")
      .download(contract.storage_path);
    if (downloadError || !blob) {
      throw new Error(`הורדת הקובץ נכשלה: ${downloadError?.message ?? "unknown"}`);
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const { text } = await extractPdfText(bytes);

    if (isLikelyScanned(text, bytes.byteLength)) {
      await updateContractStatus(user.id, id, "failed");
      return NextResponse.json({ error: SCANNED_ERROR_MESSAGE }, { status: 422 });
    }

    const chunks = chunkContract(text);
    if (chunks.length === 0) {
      await updateContractStatus(user.id, id, "failed");
      return NextResponse.json(
        { error: "לא נמצא טקסט לניתוח בחוזה." },
        { status: 422 }
      );
    }

    await updateContractStatus(user.id, id, "parsed");

    const embeddings = await embedTexts(chunks.map((c) => c.text));

    await deleteChunksForContract(user.id, id);
    const inserted = await insertContractChunks(
      user.id,
      id,
      chunks.map((c, i) => ({
        section_number: c.section_number,
        text: c.text,
        chunk_index: c.chunk_index,
        embedding: embeddings[i],
      }))
    );

    await updateContractStatus(user.id, id, "embedded");

    return NextResponse.json(
      { contract_id: id, status: "embedded", chunks: inserted },
      { status: 200 }
    );
  } catch (err) {
    // Best-effort: mark failed so the UI can offer a retry.
    try {
      await updateContractStatus(user.id, id, "failed");
    } catch {
      /* ignore secondary failure */
    }
    const message = err instanceof Error ? err.message : "processing failed";
    return NextResponse.json({ error: `העיבוד נכשל: ${message}` }, { status: 500 });
  }
}
