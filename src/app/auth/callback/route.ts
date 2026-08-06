/**
 * OAuth / PKCE callback: Supabase redirects here with a `code` after Google (or email link)
 * sign-in. We exchange it for a session cookie, then bounce to `next` (default "/").
 * See https://supabase.com/docs/guides/auth/server-side/nextjs
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only accept a LOCAL path for `next` (starts with a single "/", not "//" or "/\") — otherwise an
  // attacker-supplied ?next= could steer the post-login redirect off-origin (open redirect / phishing).
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // In prod behind a proxy, honor the forwarded host so the redirect stays on-origin.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      if (isLocal) return NextResponse.redirect(`${origin}${next}`);
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${next}`);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback`);
}
