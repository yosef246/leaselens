/**
 * POST /api/contracts/[id]/feedback — record human feedback on the issue-detection judge.
 * Guarded by session + explicit ownership (on top of RLS). `issue_id` is optional (feedback may be
 * about a missing detection, not a specific flagged clause).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getContract } from "@/lib/db/contracts";
import { insertUserFeedback } from "@/lib/db/user-feedback";

export const runtime = "nodejs";

const feedbackSchema = z.object({
  note: z.string().trim().min(3, "הערה קצרה מדי").max(2000, "הערה ארוכה מדי"),
  issue_id: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" },
      { status: 400 }
    );
  }

  try {
    await insertUserFeedback(user.id, {
      contractId: id,
      issueId: parsed.data.issue_id ?? null,
      note: parsed.data.note,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שמירת המשוב נכשלה";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
