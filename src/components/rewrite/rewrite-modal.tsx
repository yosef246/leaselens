"use client";

/**
 * Contract Rewriter modal. Orchestrates three phases — prompt → processing → done — and consumes
 * the SSE stream from POST /api/contracts/[id]/rewrite, mapping each frame to the progress UI.
 *
 * We read the response body with a stream reader (not EventSource, which can't POST) and parse the
 * `data: {json}\n\n` SSE frames by hand, matching the app's existing streaming pattern.
 */
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { ContractIssueRow } from "@/lib/db/contract-issues";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RewritePromptPhase } from "@/components/rewrite/rewrite-prompt-phase";
import { RewriteProcessingPhase } from "@/components/rewrite/rewrite-processing-phase";
import { RewriteDonePhase } from "@/components/rewrite/rewrite-done-phase";

type Phase = "prompt" | "processing" | "done";

interface DoneFrame {
  type: "done";
  percent: 100;
  url: string;
  rewrite_id: string;
}
type Frame =
  | { type: "progress"; step: number; label: string; percent: number }
  | DoneFrame
  | { type: "error"; message: string };

export function RewriteModal({
  open,
  onOpenChange,
  contractId,
  approvedIssues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  approvedIssues: ContractIssueRow[];
}) {
  const [phase, setPhase] = useState<Phase>("prompt");
  const [step, setStep] = useState(1);
  const [percent, setPercent] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const runningRef = useRef(false);

  const reset = useCallback(() => {
    setPhase("prompt");
    setStep(1);
    setPercent(0);
    setPdfUrl(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      // Don't let a click-away abort an in-flight generation.
      if (!next && phase === "processing") return;
      if (!next) reset();
      onOpenChange(next);
    },
    [phase, reset, onOpenChange]
  );

  const runRewrite = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("processing");
    setStep(1);
    setPercent(5);

    try {
      const res = await fetch(`/api/contracts/${contractId}/rewrite`, { method: "POST" });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "יצירת החוזה נכשלה");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse complete SSE frames (separated by a blank line).
        let sep;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const dataLine = raw.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const frame = JSON.parse(dataLine.slice(5).trim()) as Frame;

          if (frame.type === "progress") {
            setStep(frame.step);
            setPercent(frame.percent);
          } else if (frame.type === "done") {
            setPercent(100);
            setPdfUrl(frame.url);
            setPhase("done");
          } else if (frame.type === "error") {
            throw new Error(frame.message);
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "יצירת החוזה נכשלה");
      reset();
    } finally {
      runningRef.current = false;
    }
  }, [contractId, reset]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {phase === "done" ? "החוזה המתוקן מוכן" : "יצירת חוזה מתוקן"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            יצירת גרסה מתוקנת של החוזה על סמך התיקונים שאושרו
          </DialogDescription>
        </DialogHeader>

        {phase === "prompt" && (
          <RewritePromptPhase
            approvedCount={approvedIssues.length}
            onConfirm={runRewrite}
            onDismiss={() => handleOpenChange(false)}
          />
        )}
        {phase === "processing" && (
          <RewriteProcessingPhase currentStep={step} percent={percent} />
        )}
        {phase === "done" && pdfUrl && (
          <RewriteDonePhase
            pdfUrl={pdfUrl}
            approvedIssues={approvedIssues}
            onRegenerate={runRewrite}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
