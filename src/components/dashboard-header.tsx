import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { SignOutButton } from "@/components/sign-out-button";

/** App navbar (dashboard + results). Shows the signed-in user + sign-out. */
export function DashboardHeader({ email }: { email?: string | null }) {
  const initial = email?.trim()?.[0]?.toUpperCase() ?? "?";
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span aria-hidden>📋</span>
          <span>LeaseLens</span>
        </Link>
        <div className="flex items-center gap-3">
          <ModeToggle />
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
              title={email ?? undefined}
            >
              {initial}
            </span>
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
