/**
 * DELETE /api/contracts/[id] — remove a contract and everything derived from it.
 *
 * Guarded by session + explicit ownership (on top of RLS). Deleting the contracts row cascades to
 * chunks / issues / rewrites / usage logs / feedback. Storage objects (the original PDF and any
 * generated rewritten PDFs) aren't cascade-managed, so we clean them up best-effort here.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getContract, deleteContract } from "@/lib/db/contracts";

export const runtime = "nodejs";

export async function DELETE(
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

  try {
    await deleteContract(user.id, id); // authoritative; cascades to all child rows
  } catch (err) {
    const message = err instanceof Error ? err.message : "המחיקה נכשלה";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Best-effort Storage cleanup — never fails the request (the DB row is the source of truth).
  try {
    await supabase.storage.from("contracts").remove([contract.storage_path]);
    const prefix = `${user.id}/${id}`;
    const { data: rewrites } = await supabase.storage.from("rewritten-contracts").list(prefix);
    if (rewrites && rewrites.length > 0) {
      await supabase.storage
        .from("rewritten-contracts")
        .remove(rewrites.map((f) => `${prefix}/${f.name}`));
    }
  } catch {
    /* orphaned storage objects are harmless; ignore */
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
