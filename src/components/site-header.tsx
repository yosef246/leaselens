import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

/** Marketing navbar (landing + demo). CTA adapts to auth state. */
export function SiteHeader({ authed }: { authed: boolean }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span aria-hidden>📋</span>
          <span>LeaseLens</span>
        </Link>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button asChild>
            <Link href={authed ? "/dashboard" : "/sign-in"}>{authed ? "לדשבורד" : "התחבר"}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
