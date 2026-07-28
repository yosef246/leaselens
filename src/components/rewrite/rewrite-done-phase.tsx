"use client";

/**
 * Phase 3 of the rewrite modal: the generated PDF. Shows an inline preview (iframe on the signed
 * URL) plus actions — download PDF, toggle a side-by-side comparison, and regenerate. DOCX export
 * is deferred; its button is shown disabled rather than faked.
 */
import { useState } from "react";
import { Download, FileType2, Columns2, RefreshCw } from "lucide-react";
import type { ContractIssueRow } from "@/lib/db/contract-issues";
import { Button } from "@/components/ui/button";
import { ContractComparison } from "@/components/rewrite/contract-comparison";

export function RewriteDonePhase({
  pdfUrl,
  approvedIssues,
  onRegenerate,
}: {
  pdfUrl: string;
  approvedIssues: ContractIssueRow[];
  onRegenerate: () => void;
}) {
  const [showCompare, setShowCompare] = useState(false);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in-50">
      {showCompare ? (
        <div className="max-h-[55vh] overflow-y-auto pe-1">
          <ContractComparison issues={approvedIssues} />
        </div>
      ) : (
        <iframe
          title="תצוגה מקדימה של החוזה המתוקן"
          src={pdfUrl}
          className="h-[55vh] w-full rounded-lg border border-border"
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <a href={pdfUrl} download="contract-revised.pdf">
            <Download className="h-4 w-4" />
            הורד PDF
          </a>
        </Button>
        <Button variant="outline" disabled title="בקרוב">
          <FileType2 className="h-4 w-4" />
          הורד DOCX
        </Button>
        <Button variant="outline" onClick={() => setShowCompare((v) => !v)}>
          <Columns2 className="h-4 w-4" />
          {showCompare ? "הצג PDF" : "השווה מול המקורי"}
        </Button>
        <Button variant="ghost" onClick={onRegenerate}>
          <RefreshCw className="h-4 w-4" />
          צור שוב
        </Button>
      </div>
    </div>
  );
}
