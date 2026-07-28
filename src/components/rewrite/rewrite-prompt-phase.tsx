"use client";

/** Phase 1 of the rewrite modal: ask the user whether to generate a corrected contract. */
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RewritePromptPhase({
  approvedCount,
  onConfirm,
  onDismiss,
}: {
  approvedCount: number;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center animate-in fade-in-50">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FileText className="h-7 w-7" />
      </div>
      <div>
        <h3 className="text-lg font-bold">רוצה ליצור חוזה חדש ומעודכן?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          נשלב את {approvedCount} התיקונים שאישרת לחוזה מתוקן, תוך שמירה על המבנה והמספור המקוריים.
        </p>
      </div>
      <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row-reverse">
        <Button className="w-full sm:w-auto" onClick={onConfirm}>
          כן, צור חוזה חדש
        </Button>
        <Button variant="outline" className="w-full sm:w-auto" onClick={onDismiss}>
          דחה
        </Button>
      </div>
    </div>
  );
}
