"use client";

/**
 * Auth-aware call-to-action. Lets the marketing pages (landing, demo) render fully static
 * (`force-static`) while still personalizing the button: the auth check runs on the client after
 * hydration instead of on the server, so no request-time cookie read is needed. Until we know the
 * session, we optimistically show the guest label (the common case for a crawler / first visit).
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Props = {
  guestHref?: string;
  guestLabel: string;
  authedHref?: string;
  authedLabel: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
};

export function AuthCta({
  guestHref = "/sign-in",
  guestLabel,
  authedHref = "/dashboard",
  authedLabel,
  size,
  variant,
  className,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setAuthed(!!data.user);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <Button asChild size={size} variant={variant} className={className}>
      <Link href={authed ? authedHref : guestHref}>{authed ? authedLabel : guestLabel}</Link>
    </Button>
  );
}
