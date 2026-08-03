"use client";

/**
 * Phase 3 of the rewrite modal: the generated PDF. Shows an inline preview (iframe on the signed
 * URL) plus actions — download PDF, toggle a side-by-side comparison, regenerate, and share the PDF
 * link to WhatsApp. DOCX export is deferred; its button is shown disabled rather than faked.
 */
import { useState } from "react";
import { Download, FileType2, Columns2, RefreshCw, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { ContractIssueRow } from "@/lib/db/contract-issues";
import { Button } from "@/components/ui/button";
import { ContractComparison } from "@/components/rewrite/contract-comparison";

/** Normalize an Israeli phone number to wa.me's international form (972XXXXXXXXX), or null if invalid. */
function normalizeIsraeliPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^972\d{9}$/.test(digits)) return digits; // already international
  if (/^0\d{9}$/.test(digits)) return "972" + digits.slice(1); // 05X-XXXXXXX
  if (/^\d{9}$/.test(digits)) return "972" + digits; // missing leading 0
  return null;
}

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
  const [phone, setPhone] = useState("");

  function sendWhatsApp() {
    const normalized = normalizeIsraeliPhone(phone);
    if (!normalized) {
      toast.error("מספר טלפון לא תקין. הזן מספר ישראלי, למשל 050-0000000.");
      return;
    }
    const message =
      `שלום! מצורף חוזה השכירות המתוקן שהופק ב-LeaseLens:\n${pdfUrl}\n\n` +
      "החוזה כולל את התיקונים המומלצים לפי החוק. הקישור בתוקף ל-24 שעות.";
    window.open(
      `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
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

      {/* Share to WhatsApp — opens WhatsApp with the PDF link prefilled (not an automated send). */}
      <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
        <label htmlFor="wa-phone" className="mb-2 block text-sm font-medium">
          שלח את החוזה בוואטסאפ
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="wa-phone"
            type="tel"
            inputMode="numeric"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-0000000"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <Button
            type="button"
            onClick={sendWhatsApp}
            className="shrink-0 bg-[#25D366] text-white hover:bg-[#20bd5a]"
          >
            <MessageCircle className="h-4 w-4" />
            שלח בוואטסאפ
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          ייפתח וואטסאפ עם הודעה מוכנה הכוללת קישור לחוזה — לחיצה על ״שלח״ אצלך תשלים את השליחה.
        </p>
      </div>
    </div>
  );
}
