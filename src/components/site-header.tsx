import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { AuthCta } from "@/components/auth-cta";

/**
 * Marketing navbar (landing + demo). The CTA adapts to auth state on the client (AuthCta), which
 * keeps the host pages statically renderable.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span aria-hidden>📋</span>
          <span>LeaseLens</span>
        </Link>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <AuthCta guestLabel="התחבר" authedLabel="לדשבורד" />
        </div>
      </div>
    </header>
  );
}
