import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const NAV = [
  { href: "/how-it-works", label: "איך זה עובד" },
  { href: "/pricing", label: "מחיר" },
  { href: "/about", label: "אודות" },
  { href: "/faq", label: "שאלות נפוצות" },
  { href: "/blog", label: "בלוג" },
  { href: "/demo", label: "הדגמה" },
];

const LAWS = [
  "חוק השכירות והשאילה, תשל״א-1971",
  "חוק שכירות הוגנת, תשע״ז-2017",
  "עדכוני פסיקה של בית המשפט העליון",
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground sm:justify-start">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Legal citation — the corpus the analysis is grounded in, + disclaimer. */}
        <div className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">מבוסס על:</p>
          <ul className="flex flex-wrap gap-x-2 gap-y-1">
            {LAWS.map((law, i) => (
              <li key={law}>
                {law}
                {i < LAWS.length - 1 && <span className="mx-1 text-border">·</span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px]">
            השירות הוא כלי עזר ואינו תחליף לייעוץ משפטי.
          </p>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row">
          <span>
            © {new Date().getFullYear()} {SITE_NAME}
          </span>
          <span>Built with Next.js · Claude · pgvector</span>
        </div>
      </div>
    </footer>
  );
}
