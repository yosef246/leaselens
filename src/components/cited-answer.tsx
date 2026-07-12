"use client";

/**
 * Renders a grounded answer with inline citation badges + a sources list. Shared by the demo
 * page and the live results view. Law markers are numeric ([1]) and colored blue; contract
 * markers are Hebrew letters ([א]) and colored emerald; keyword-matched sources get an amber tag.
 * Optional onCiteClick lets a parent scroll/highlight the cited source.
 */
import type { RagSource } from "@/lib/rag/prompt";
import { cn } from "@/lib/utils";

const CITE_OR_BOLD = /(\*\*[^*]+\*\*|\[(?:[0-9]{1,2}|[א-י])\])/g;
const CITE = /^\[([0-9]{1,2}|[א-י])\]$/;

function isLawMarker(marker: string) {
  return /^[0-9]+$/.test(marker);
}

export interface CitedAnswerProps {
  answer: string;
  sources: RagSource[];
  onCiteClick?: (marker: string) => void;
  debug?: boolean;
  className?: string;
}

export function CitedAnswer({ answer, sources, onCiteClick, debug, className }: CitedAnswerProps) {
  const lawSources = sources.filter((s) => s.type === "law");
  const contractSources = sources.filter((s) => s.type === "contract");

  const parts = answer.split(CITE_OR_BOLD).filter(Boolean);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={i} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          const m = part.match(CITE);
          if (m) {
            const marker = m[1];
            const law = isLawMarker(marker);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onCiteClick?.(marker)}
                className={cn(
                  "mx-0.5 inline-flex items-center rounded px-1 font-mono text-xs font-semibold align-baseline transition-colors",
                  law
                    ? "bg-chart-2/15 text-chart-2 hover:bg-chart-2/25"
                    : "bg-primary/15 text-primary hover:bg-primary/25",
                  !onCiteClick && "cursor-default"
                )}
              >
                {part}
              </button>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>

      {sources.length > 0 && (
        <div className="border-t border-border/60 pt-3">
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">מקורות</h4>
          <ul className="flex flex-col gap-1.5">
            {[...lawSources, ...contractSources].map((s) => {
              const law = s.type === "law";
              return (
                <li key={`${s.type}-${s.marker}`}>
                  <button
                    type="button"
                    onClick={() => onCiteClick?.(s.marker)}
                    className="flex w-full items-start gap-2 text-right text-xs hover:opacity-80"
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono font-semibold",
                        law ? "bg-chart-2/15 text-chart-2" : "bg-primary/15 text-primary"
                      )}
                    >
                      [{s.marker}]
                    </span>
                    <span className="flex-1">
                      <span className="font-medium text-foreground">{s.label}</span>
                      {s.keyword_matched && (
                        <span className="ms-1 rounded border border-amber-500/40 px-1 text-[10px] text-amber-600 dark:text-amber-400">
                          keyword
                        </span>
                      )}
                      {debug && typeof s.similarity === "number" && (
                        <span className="ms-1 text-muted-foreground">({s.similarity.toFixed(3)})</span>
                      )}
                      <span className="block text-muted-foreground">{s.snippet}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
