/** Transparency badges shown under the hero — builds trust before the user uploads a contract. */
const BADGES = [
  { icon: "🔒", label: "מוצפן end-to-end" },
  { icon: "🗑", label: "נמחק אוטומטית אחרי 30 יום" },
  { icon: "🚫", label: "לא משותף עם צד שלישי" },
];

export function TrustBadges({ className }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-3 ${className ?? ""}`}>
      {BADGES.map((b) => (
        <li
          key={b.label}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm"
        >
          <span aria-hidden className="text-base">
            {b.icon}
          </span>
          {b.label}
        </li>
      ))}
    </ul>
  );
}
