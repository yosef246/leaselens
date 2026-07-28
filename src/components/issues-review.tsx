"use client";

/**
 * Proactive problem-clause review. Lists the issues the /review analysis flagged, most severe
 * first, each with: a severity icon, category tag, the original clause, a plain-Hebrew
 * explanation, an EDITABLE suggested fix, the grounding law reference, and an approval checkbox.
 *
 * Generation (POST /review) fans out one Claude call per section, so it can take up to a minute;
 * we refresh the server component afterwards to pull the persisted rows. Per-issue edits/approvals
 * PATCH the same endpoint.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Sparkles, ArrowRight, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import type { ContractStatus } from "@/lib/db/contracts";
import type { ContractIssueRow, IssueCategory } from "@/lib/db/contract-issues";
import { Button } from "@/components/ui/button";
import { RewriteModal } from "@/components/rewrite/rewrite-modal";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<IssueCategory, string> = {
  ambiguous: "עמום",
  "one-sided": "חד-צדדי",
  "missing-standard": "חסר לפי חוק",
  illegal: "לא חוקי",
  trap: "מלכודת",
};

function severityIcon(severity: number): string {
  if (severity >= 5) return "🔴";
  if (severity >= 3) return "🟠";
  return "🟡";
}

function severityLabel(severity: number): string {
  if (severity >= 5) return "חמור מאוד";
  if (severity >= 3) return "בינוני";
  return "קל";
}

export function IssuesReview({
  contractId,
  title,
  status,
  initialIssues,
}: {
  contractId: string;
  title: string;
  status: ContractStatus;
  initialIssues: ContractIssueRow[];
}) {
  const router = useRouter();
  const [issues, setIssues] = useState<ContractIssueRow[]>(initialIssues);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const autoPromptedRef = useRef(false);

  const approvedIssues = issues.filter((i) => i.user_approved);

  // Keep local state in sync when a server refresh brings freshly-generated issues.
  useEffect(() => setIssues(initialIssues), [initialIssues]);

  // Offer the rewrite once, automatically, when every flagged issue has been approved.
  useEffect(() => {
    const allApproved = issues.length > 0 && issues.every((i) => i.user_approved);
    if (allApproved && !autoPromptedRef.current) {
      autoPromptedRef.current = true;
      setRewriteOpen(true);
    } else if (!allApproved) {
      autoPromptedRef.current = false;
    }
  }, [issues]);

  async function runAnalysis() {
    if (analyzing) return;
    if (status !== "embedded") {
      toast.error("החוזה עדיין לא עובד. חזור לדשבורד והרץ ״עבד״.");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/review`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { issues?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "הסקירה נכשלה");
      toast.success(
        data.issues ? `נמצאו ${data.issues} סעיפים לתשומת לב` : "לא נמצאו סעיפים בעייתיים 🎉"
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "הסקירה נכשלה");
    } finally {
      setAnalyzing(false);
    }
  }

  function patchLocal(id: string, patch: Partial<ContractIssueRow>) {
    setIssues((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function saveIssue(issue: ContractIssueRow) {
    setSavingId(issue.id);
    try {
      const res = await fetch(`/api/contracts/${contractId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue_id: issue.id,
          suggested_fix: issue.suggested_fix,
          user_approved: issue.user_approved,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "העדכון נכשל");
      toast.success("נשמר");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "העדכון נכשל");
    } finally {
      setSavingId(null);
    }
  }

  const hasIssues = issues.length > 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">סעיפים בעייתיים — {title}</h1>
          <p className="text-sm text-muted-foreground">
            סקירה פרואקטיבית של סעיפים עמומים, חד-צדדיים או חריגים מהחוק.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/contracts/${contractId}`}>
            <ArrowRight className="h-4 w-4" />
            חזרה לשאלות
          </Link>
        </Button>
      </div>

      {status !== "embedded" && (
        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          החוזה עדיין לא עובד. חזור לדשבורד והרץ ״עבד״ לפני הסקירה.
        </div>
      )}

      <div className="mb-8 flex items-center gap-3">
        <Button onClick={runAnalysis} disabled={analyzing || status !== "embedded"}>
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              מנתח… זה עשוי לקחת עד דקה
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {hasIssues ? "נתח מחדש" : "נתח סעיפים בעייתיים"}
            </>
          )}
        </Button>
        {hasIssues && (
          <span className="text-sm text-muted-foreground">{issues.length} סעיפים סומנו</span>
        )}
      </div>

      {!hasIssues && !analyzing && (
        <p className="rounded-lg border border-border/60 bg-muted/40 p-5 text-sm text-muted-foreground">
          עדיין לא בוצעה סקירה לחוזה זה. לחץ ״נתח סעיפים בעייתיים״ כדי שהמערכת תסרוק את הסעיפים
          ותסמן את מה שכדאי לשים לב אליו.
        </p>
      )}

      <div className="space-y-5">
        {issues.map((issue) => (
          <article
            key={issue.id}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-sm",
              issue.user_approved ? "border-primary/50" : "border-border"
            )}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-lg" title={severityLabel(issue.severity)} aria-hidden>
                {severityIcon(issue.severity)}
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {CATEGORY_LABEL[issue.category]}
              </span>
              <span className="text-xs text-muted-foreground">
                חומרה {issue.severity}/5 · {severityLabel(issue.severity)}
              </span>
              {issue.section_number && (
                <span className="text-xs text-muted-foreground">· סעיף {issue.section_number}</span>
              )}
            </div>

            <blockquote className="mb-3 border-s-2 border-border ps-3 text-sm text-foreground/90">
              {issue.original_text}
            </blockquote>

            <p className="mb-3 text-sm leading-relaxed">{issue.explanation}</p>

            <div className="mb-3">
              <label
                htmlFor={`fix-${issue.id}`}
                className="mb-1 block text-xs font-semibold text-muted-foreground"
              >
                הצעת ניסוח משופר (ניתן לעריכה)
              </label>
              <textarea
                id={`fix-${issue.id}`}
                value={issue.suggested_fix}
                onChange={(e) => patchLocal(issue.id, { suggested_fix: e.target.value })}
                rows={3}
                className="w-full resize-y rounded-lg border border-input bg-background p-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={issue.user_approved}
                    onChange={(e) => patchLocal(issue.id, { user_approved: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  מאשר את התיקון
                </label>
                {issue.law_reference && (
                  <span className="rounded-md bg-chart-2/10 px-2 py-1 font-mono text-xs text-chart-2">
                    {issue.law_reference}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveIssue(issue)}
                disabled={savingId === issue.id}
              >
                {savingId === issue.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור"}
              </Button>
            </div>
          </article>
        ))}
      </div>

      {approvedIssues.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/[0.04] p-4">
          <p className="text-sm">
            אישרת {approvedIssues.length} תיקונים. אפשר ליצור חוזה מתוקן שמשלב אותם.
          </p>
          <Button onClick={() => setRewriteOpen(true)}>
            <FileCheck2 className="h-4 w-4" />
            סיום סקירה — צור חוזה מתוקן
          </Button>
        </div>
      )}

      <RewriteModal
        open={rewriteOpen}
        onOpenChange={setRewriteOpen}
        contractId={contractId}
        approvedIssues={approvedIssues}
      />
    </main>
  );
}
