"use client";

/**
 * Phase 2 of the rewrite modal: live progress via SSE. Shows the four pipeline steps with
 * check / spinner / idle states and a real percentage bar driven by the server's frames.
 */
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { step: 1, label: "מנתח סעיפים מקוריים" },
  { step: 2, label: "משלב תיקונים" },
  { step: 3, label: "מפרמט וכתיבה מחדש" },
  { step: 4, label: "יצירת PDF" },
];

export function RewriteProcessingPhase({
  currentStep,
  percent,
}: {
  currentStep: number;
  percent: number;
}) {
  return (
    <div className="flex flex-col gap-5 py-2">
      <ul className="flex flex-col gap-3">
        {STEPS.map(({ step, label }) => {
          const done = step < currentStep;
          const active = step === currentStep;
          return (
            <li key={step} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  done && "bg-primary/15 text-primary",
                  active && "bg-primary/10 text-primary",
                  !done && !active && "bg-muted text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current opacity-40" />
                )}
              </span>
              <span className={cn(done || active ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>

      <div>
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>מייצר חוזה מתוקן…</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
