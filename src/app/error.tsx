"use client";

// Root error boundary — catches errors thrown anywhere below the root layout (RTL/lang inherited
// from it). global-error.tsx would additionally cover the root layout itself; not added yet.
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">משהו השתבש</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        אירעה שגיאה בלתי צפויה. נסה שוב, ואם הבעיה נמשכת חזור לדף הבית.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>נסה שוב</Button>
        <Button asChild variant="outline">
          <Link href="/">לדף הבית</Link>
        </Button>
      </div>
    </div>
  );
}
