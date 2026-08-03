"use client";

/**
 * Phase 3 of the rewrite modal: the generated PDF. Shows an inline preview (iframe) plus actions —
 * share the actual PDF file to WhatsApp (Web Share API, so it's saved in the chat forever), toggle a
 * side-by-side comparison, and regenerate. There is intentionally no direct download: the product
 * flow is "save it to WhatsApp as a PDF", not "download to this device".
 */
import { useEffect, useState } from "react";
import { Columns2, RefreshCw, MessageCircle } from "lucide-react";
import type { ContractIssueRow } from "@/lib/db/contract-issues";
import { Button } from "@/components/ui/button";
import { ContractComparison } from "@/components/rewrite/contract-comparison";

const SHARE_MESSAGE =
  "שלום! מצורף חוזה השכירות המתוקן שהופק ב-LeaseLens, כולל התיקונים המומלצים לפי החוק.";

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
  const [file, setFile] = useState<File | null>(null);

  // Pre-fetch the PDF as a File so navigator.share can hand the actual document to the OS share sheet
  // synchronously on click (an await between the click and share() can drop the user-activation that
  // Web Share requires). On CORS/network failure `file` stays null and we fall back to a wa.me link.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(pdfUrl);
        const blob = await res.blob();
        if (active) {
          setFile(new File([blob], "contract-revised.pdf", { type: "application/pdf" }));
        }
      } catch {
        /* fall back to the link on share */
      }
    })();
    return () => {
      active = false;
    };
  }, [pdfUrl]);

  async function shareWhatsApp() {
    // Preferred (mobile): share the real PDF file — it lands in the WhatsApp chat as a document and
    // stays there permanently, independent of the signed URL's expiry.
    if (file && typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "חוזה מתוקן — LeaseLens", text: SHARE_MESSAGE });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // user closed the share sheet
        // otherwise fall through to the link
      }
    }
    // Fallback (desktop / no file-share support): open WhatsApp with the link prefilled.
    const text = `${SHARE_MESSAGE}\n\n${pdfUrl}\n\n(הקישור בתוקף ל-24 שעות)`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

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

      <div>
        <Button
          onClick={shareWhatsApp}
          className="w-full bg-[#25D366] text-white hover:bg-[#20bd5a]"
        >
          <MessageCircle className="h-4 w-4" />
          שלח בוואטסאפ
        </Button>
        <p className="mt-1.5 text-center text-[11px] leading-snug text-muted-foreground">
          החוזה יישלח כקובץ PDF שנשמר בצ׳אט. בדסקטופ — ייפתח וואטסאפ עם קישור (בתוקף ל-24 שעות).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
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
