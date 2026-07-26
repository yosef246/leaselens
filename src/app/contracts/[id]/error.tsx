"use client";

// Error boundary for a single contract's results segment. Client Component (React requirement).
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ContractResultsError({
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
      <h1 className="text-xl font-bold">לא הצלחנו לטעון את החוזה</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        ייתכן שהחוזה עדיין בעיבוד, או שאירעה שגיאה זמנית. נסה שוב או חזור לרשימת החוזים.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>נסה שוב</Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">לרשימת החוזים</Link>
        </Button>
      </div>
    </div>
  );
}
