"use client";

/**
 * Side-by-side comparison of the approved fixes: each row shows the original clause next to the
 * corrected wording the user approved. Uses the review data already on the client — no extra fetch.
 */
import type { ContractIssueRow } from "@/lib/db/contract-issues";

export function ContractComparison({ issues }: { issues: ContractIssueRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      {issues.map((issue) => (
        <div key={issue.id} className="rounded-lg border border-border">
          <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {issue.section_number ? `סעיף ${issue.section_number}` : "קטע"}
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-2">
            <div className="bg-card p-3">
              <p className="mb-1 text-[11px] font-semibold text-muted-foreground">מקורי</p>
              <p className="text-sm leading-relaxed text-foreground/80">{issue.original_text}</p>
            </div>
            <div className="bg-primary/[0.04] p-3">
              <p className="mb-1 text-[11px] font-semibold text-primary">מתוקן</p>
              <p className="text-sm leading-relaxed">{issue.suggested_fix}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
