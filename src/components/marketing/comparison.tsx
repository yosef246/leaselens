import { Check, X } from "lucide-react";

/** "בלי LeaseLens ↔ עם LeaseLens" — value contrast without naming competitors. */
const ROWS: { without: string; with: string }[] = [
  { without: "חותמים בלי לדעת מה יש בפנים", with: "יודעים בדיוק על מה חותמים" },
  { without: "500–1500 ₪ לעורך דין לבדיקה", with: "49 ₪, פעם אחת" },
  { without: "ימי המתנה לתשובה", with: "דו״ח מלא תוך 2 דקות" },
  { without: "דו״ח בשפה משפטית מסובכת", with: "הסברים בעברית פשוטה + סעיף חוק" },
  { without: "מקבלים חוזה — אי אפשר לתקן", with: "מקבלים חוזה מתוקן מוכן לחתימה" },
];

export function Comparison() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* With (right in RTL) — the positive column */}
      <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-6 sm:p-8">
        <h3 className="mb-5 text-lg font-bold text-primary">עם LeaseLens</h3>
        <ul className="space-y-4">
          {ROWS.map((r) => (
            <li key={r.with} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="h-4 w-4" />
              </span>
              <span className="text-[15px] leading-relaxed">{r.with}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Without (left in RTL) — the status quo */}
      <div className="rounded-2xl border border-border/70 bg-muted/30 p-6 sm:p-8">
        <h3 className="mb-5 text-lg font-bold text-muted-foreground">בלי LeaseLens</h3>
        <ul className="space-y-4">
          {ROWS.map((r) => (
            <li key={r.without} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <X className="h-4 w-4" />
              </span>
              <span className="text-[15px] leading-relaxed text-muted-foreground">{r.without}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
