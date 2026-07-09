/**
 * POST /api/contracts/upload — accept one PDF, store it privately, register a contract row.
 *
 * Flow: auth (401 if none) → validate (PDF only, ≤10MB, Zod at the boundary) → upload to
 * Storage at <user_id>/<contract_id>.pdf → INSERT via the D4 db layer. No parsing / chunking
 * / embeddings yet — that's the next round. If the DB insert fails after upload, the orphaned
 * object is removed so Storage and the table stay consistent.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { insertContract } from "@/lib/db/contracts";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const uploadMetaSchema = z.object({
  filename: z.string().min(1),
  type: z.literal("application/pdf"),
  size: z.number().int().positive().max(MAX_BYTES),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "בקשה לא תקינה — נדרש multipart/form-data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "לא צורף קובץ" }, { status: 400 });
  }

  const meta = uploadMetaSchema.safeParse({
    filename: file.name,
    type: file.type,
    size: file.size,
  });
  if (!meta.success) {
    return NextResponse.json(
      { error: "קובץ לא תקין — נדרש PDF בגודל עד 10MB" },
      { status: 400 }
    );
  }

  const contractId = crypto.randomUUID();
  const storagePath = `${user.id}/${contractId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("contracts")
    .upload(storagePath, file, { contentType: "application/pdf", upsert: false });
  if (uploadError) {
    return NextResponse.json(
      { error: `שמירת הקובץ נכשלה: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const title = file.name.replace(/\.pdf$/i, "").trim() || "חוזה ללא שם";

  try {
    const contract = await insertContract(user.id, {
      id: contractId,
      title,
      storagePath,
    });
    return NextResponse.json(
      { contract_id: contract.id, storage_path: contract.storage_path },
      { status: 201 }
    );
  } catch (err) {
    // Roll back the orphaned object so Storage and the table don't drift.
    await supabase.storage.from("contracts").remove([storagePath]);
    const message = err instanceof Error ? err.message : "insert failed";
    return NextResponse.json(
      { error: `רישום החוזה נכשל: ${message}` },
      { status: 500 }
    );
  }
}
