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

/** Path prefixes reachable without a session. */
const PUBLIC_PREFIXES = ["/sign-in", "/auth"];

export async function updateSession(request: NextRequest): Promise<NextResponse> {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
