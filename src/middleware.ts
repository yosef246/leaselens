import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all request paths EXCEPT:
     * - _next/static, _next/image (build assets)
     * - favicon.ico / favicon.svg and common static image types
     * - public metadata routes: manifest.webmanifest, robots.txt, sitemap.xml, opengraph-image.
     *   These are fetched WITHOUT a session (the browser's manifest fetch, and crawlers), so if the
     *   auth guard saw them it would redirect to /sign-in — the browser then parses the sign-in
     *   HTML as a manifest ("Syntax error line 1"), and crawlers get a redirect instead of the file.
     * The auth guard itself (which paths are public) lives in updateSession.
     * NOTE: with a src/ directory this MUST live at src/middleware.ts — a root-level
     * middleware.ts is silently ignored by Next.js.
     */
    "/((?!_next/static|_next/image|favicon\\.(?:ico|svg)|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
