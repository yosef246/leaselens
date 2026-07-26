/**
 * Supabase SSR session refresh + route guard (official Next.js recipe).
 *
 * Runs on every matched request (see root middleware.ts): refreshes the auth cookie so
 * Server Components always see a fresh session, then redirects unauthenticated users to
 * /sign-in for everything except the auth surface (/sign-in, /auth/*).
 *
 * IMPORTANT: do not add code between `createServerClient` and `getUser()` — it can cause
 * hard-to-debug session bugs (per Supabase docs).
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Path prefixes reachable without a session (marketing + auth surface). */
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/auth", // includes /auth/reset-password (recovery token arrives in the URL hash)
  "/demo",
];
/** Exact public paths (the landing page — "/" as a prefix would match everything). */
const PUBLIC_EXACT = new Set(["/"]);

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  // Public marketing + auth pages don't need a session lookup. Skipping the Supabase getUser()
  // round-trip here keeps it out of the TTFB of "/" and "/demo" — the pages that carry the
  // SEO/AEO weight. A signed-in user's cookie simply refreshes on the next protected navigation.
  if (isPublic) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not add code between createServerClient and getUser() (Supabase docs — session bugs).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
