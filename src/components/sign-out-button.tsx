"use client";

/**
 * Sign-out button with immediate click feedback. The submit still does the same native POST to
 * /auth/signout (a full-page navigation) — we only flip a local `pending` flag on submit so the
 * button shows a spinner instead of looking frozen during the server round-trip + redirect. The
 * state update is batched after the native submit has already dispatched, so it never cancels it.
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <form action="/auth/signout" method="post" onSubmit={() => setPending(true)}>
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            מתנתק…
          </>
        ) : (
          "התנתקות"
        )}
      </Button>
    </form>
  );
}
