"use client";

/**
 * Ask-about-your-contract panel. Streams a grounded Claude answer from /api/contracts/[id]/ask,
 * reads the retrieved sources off the X-Sources header, and renders inline-cited answer + a
 * sources list (law = [1], [2]…, contract = [א], [ב]…). Click a source to see it in a modal.
 * ?debug=1 reveals similarity scores (for our QA, not end users).
 */
import { useEffect, useState } from "react";
import { D2_DISCLAIMER, GROUNDED_EMPTY, type RagSource } from "@/lib/rag/prompt";

function decodeSources(header: string | null): RagSource[] {
  if (!header) return [];
  try {
    const bytes = Uint8Array.from(atob(header), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as RagSource[];
  } catch {
    return [];
  }
}

export function AskPanel({ contractId }: { contractId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<RagSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const [selected, setSelected] = useState<RagSource | null>(null);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (question.trim().length < 3 || loading) return;
    setLoading(true);
    setError(null);
    setAnswer("");
    setSources([]);
    try {
      const res = await fetch(`/api/contracts/${contractId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "השאלה נכשלה");
      }
      setSources(decodeSources(res.headers.get("X-Sources")));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setAnswer(acc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "השאלה נכשלה");
    } finally {
      setLoading(false);
    }
  }

  const lawSources = sources.filter((s) => s.type === "law");
  const contractSources = sources.filter((s) => s.type === "contract");
  // Only a BARE grounded-empty answer gets the friendly note. If the model added a cited
  // explanation after the phrase, that's useful — render the full answer instead of hiding it.
  const isEmptyAnswer = answer.trim() === GROUNDED_EMPTY;

  return (
    <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <form onSubmit={ask} className="flex flex-col gap-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="שאל שאלה על החוזה — למשל: האם סעיף הפיקדון חוקי?"
          rows={2}
          className="w-full resize-y rounded-md border border-stone-300 bg-white p-2 text-sm text-stone-900 placeholder:text-stone-400"
        />
        <button
          type="submit"
          disabled={loading || question.trim().length < 3}
          className="self-start rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "חושב…" : "שאל"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {answer && (
        <div className="mt-3">
          {isEmptyAnswer ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              לא מצאנו בחוזה ובחוק בסיס ודאי לתשובה על השאלה הזו. נסה לנסח אותה אחרת, או לשאול על
              סעיף ספציפי.
            </p>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-800">{answer}</p>
          )}

          {!isEmptyAnswer && sources.length > 0 && (
            <div className="mt-3 border-t border-stone-200 pt-3">
              <h4 className="mb-2 text-xs font-semibold text-stone-500">מקורות</h4>
              <ul className="flex flex-col gap-1.5">
                {[...lawSources, ...contractSources].map((s) => (
                  <li key={`${s.type}-${s.marker}`}>
                    <button
                      type="button"
                      onClick={() => setSelected(s)}
                      className="flex w-full items-start gap-2 text-right text-xs text-stone-700 hover:text-stone-900"
                    >
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 font-mono font-semibold ${
                          s.type === "law"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        [{s.marker}]
                      </span>
                      <span className="flex-1">
                        <span className="font-medium">{s.label}</span>
                        {debug && (
                          <span className="ms-1 text-stone-400">({s.similarity.toFixed(3)})</span>
                        )}
                        <span className="block text-stone-500">{s.snippet}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-3 border-t border-stone-200 pt-2 text-[11px] leading-snug text-stone-500">
            {D2_DISCLAIMER}
          </p>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            dir="rtl"
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-stone-900">
                [{selected.marker}] {selected.label}
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-stone-400 hover:text-stone-700"
                aria-label="סגור"
              >
                ✕
              </button>
            </div>
            {selected.section_number && (
              <p className="mb-1 text-xs text-stone-500">סעיף {selected.section_number}</p>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
              {selected.snippet}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
