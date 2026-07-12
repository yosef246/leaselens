"use client";

/**
 * Split-view results page. Right: ask box + suggested questions + streamed, cited answers.
 * Left: the contract's own text (chunk by chunk). Clicking a contract citation scrolls to and
 * highlights that clause; clicking a law citation opens it in a dialog. ?debug=1 shows scores.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Brain, Send } from "lucide-react";
import { toast } from "sonner";
import type { ContractStatus } from "@/lib/db/contracts";
import type { ContractChunkRow } from "@/lib/db/contract-chunks";
import { D2_DISCLAIMER, GROUNDED_EMPTY, type RagSource } from "@/lib/rag/prompt";
import { CitedAnswer } from "@/components/cited-answer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SUGGESTED = [
  "האם סעיף הפיקדון חוקי?",
  "מה הזכויות שלי בסיום החוזה?",
  "האם יש סעיף לא הוגן בחוזה?",
];

interface QA {
  id: number;
  question: string;
  answer: string;
  sources: RagSource[];
  done: boolean;
  error?: string;
}

function decodeSources(header: string | null): RagSource[] {
  if (!header) return [];
  try {
    const bytes = Uint8Array.from(atob(header), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as RagSource[];
  } catch {
    return [];
  }
}

export function ResultsView({
  contractId,
  title,
  status,
  chunks,
}: {
  contractId: string;
  title: string;
  status: ContractStatus;
  chunks: ContractChunkRow[];
}) {
  const [question, setQuestion] = useState("");
  const [qas, setQas] = useState<QA[]>([]);
  const [pending, setPending] = useState(false);
  const [debug, setDebug] = useState(false);
  const [lawSource, setLawSource] = useState<RagSource | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  const onSourceClick = useCallback(
    (source: RagSource) => {
      if (source.type === "law") {
        setLawSource(source);
        return;
      }
      // Contract: scroll to + highlight the matching clause.
      const target = chunks.find((c) => c.section_number === source.section_number);
      if (!target) return;
      setHighlight(String(target.chunk_index));
      document
        .getElementById(`cc-${target.chunk_index}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => setHighlight(null), 2200);
    },
    [chunks]
  );

  const ask = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 3 || pending) return;
      if (status !== "embedded") {
        toast.error("החוזה עדיין לא עובד. חזור לדשבורד והרץ ״עבד״.");
        return;
      }
      const id = nextId.current++;
      setQas((prev) => [...prev, { id, question: trimmed, answer: "", sources: [], done: false }]);
      setQuestion("");
      setPending(true);

      const patch = (u: Partial<QA>) =>
        setQas((prev) => prev.map((qa) => (qa.id === id ? { ...qa, ...u } : qa)));

      try {
        const res = await fetch(`/api/contracts/${contractId}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmed }),
        });
        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "השאלה נכשלה");
        }
        patch({ sources: decodeSources(res.headers.get("X-Sources")) });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          patch({ answer: acc });
        }
        patch({ done: true });
      } catch (e) {
        patch({ done: true, error: e instanceof Error ? e.message : "השאלה נכשלה" });
        toast.error(e instanceof Error ? e.message : "השאלה נכשלה");
      } finally {
        setPending(false);
      }
    },
    [contractId, status, pending]
  );

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[1.15fr_0.85fr]">
      {/* Right (in RTL, first): Q&A */}
      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">שאל שאלה על החוזה — התשובה מגובה בציטוטים.</p>
        </div>

        {status !== "embedded" && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            החוזה עדיין לא עובד. חזור לדשבורד והרץ ״עבד״ לפני שאתה שואל.
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex flex-col gap-2"
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(question);
              }
            }}
            placeholder="שאל על הפיקדון, על ביטול חוזה, על תיקונים…"
            rows={2}
            className="w-full resize-y rounded-lg border border-input bg-background p-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  disabled={pending}
                  className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-secondary-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <Button type="submit" disabled={pending || question.trim().length < 3}>
              <Send className="h-4 w-4" />
              שאל
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-4">
          {qas.map((qa) => (
            <div key={qa.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-3 font-medium text-foreground">{qa.question}</p>
              {qa.error ? (
                <p className="text-sm text-destructive">{qa.error}</p>
              ) : !qa.done && qa.sources.length === 0 ? (
                <LoadingRow icon="search" label="מחפש במקורות…" />
              ) : !qa.done && qa.answer === "" ? (
                <LoadingRow icon="brain" label="מנתח…" />
              ) : qa.answer.trim() === GROUNDED_EMPTY ? (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                  לא מצאנו בחוזה ובחוק בסיס ודאי לתשובה. נסה לנסח אחרת או לשאול על סעיף ספציפי.
                </p>
              ) : (
                <CitedAnswer answer={qa.answer} sources={qa.sources} onSourceClick={onSourceClick} debug={debug} />
              )}
            </div>
          ))}
        </div>

        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{D2_DISCLAIMER}</p>
      </section>

      {/* Left (in RTL, second): the contract text */}
      <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
        <div className="flex h-full flex-col rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">טקסט החוזה</h2>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {chunks.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">אין טקסט מפורסר לחוזה זה.</p>
            ) : (
              chunks.map((c) => (
                <div
                  key={c.id}
                  id={`cc-${c.chunk_index}`}
                  className={cn(
                    "rounded-lg border p-3 text-sm transition-colors",
                    highlight === String(c.chunk_index)
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:bg-muted/50"
                  )}
                >
                  {c.section_number && (
                    <span className="font-semibold text-primary">סעיף {c.section_number}. </span>
                  )}
                  <span className="text-foreground/90">{c.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      <Dialog open={!!lawSource} onOpenChange={(o) => !o && setLawSource(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="rounded bg-chart-2/15 px-1.5 py-0.5 font-mono text-sm text-chart-2">
                [{lawSource?.marker}]
              </span>
              {lawSource?.label}
            </DialogTitle>
            <DialogDescription className="sr-only">טקסט המקור מהחוק</DialogDescription>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {lawSource?.snippet}
          </p>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function LoadingRow({ icon, label }: { icon: "search" | "brain"; label: string }) {
  const Icon = icon === "search" ? Search : Brain;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 animate-pulse" />
        {label}
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
