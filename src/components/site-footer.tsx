import Link from "next/link";

const NAV = [
  { href: "/how-it-works", label: "איך זה עובד" },
  { href: "/about", label: "אודות" },
  { href: "/blog", label: "בלוג" },
  { href: "/demo", label: "הדגמה" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-start">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-4 sm:flex-row">
          <span>Built with Next.js · Claude · pgvector</span>
          <Link
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
