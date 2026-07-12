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
     * The auth guard itself (which paths are public) lives in updateSession.
     * NOTE: with a src/ directory this MUST live at src/middleware.ts — a root-level
     * middleware.ts is silently ignored by Next.js.
     */
    "/((?!_next/static|_next/image|favicon\\.(?:ico|svg)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
