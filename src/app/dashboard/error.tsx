"use client";

// Error boundary for the dashboard segment. Must be a Client Component (React requirement).
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side digest is logged by Next; surface the client stack for debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold">אירעה שגיאה בטעינת החוזים</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        לא הצלחנו לטעון את הדשבורד. נסה שוב — ואם הבעיה נמשכת, רענן את הדף.
      </p>
      <Button onClick={reset}>נסה שוב</Button>
    </div>
  );
}
