/**
 * Server (Server Component / Route Handler) Supabase client — anon key, session in cookies.
 *
 * Official @supabase/ssr Next.js recipe. Auth/session only; NOT the user-data access
 * layer (D4). The `setAll` try/catch is expected: writing cookies from a Server Component
 * throws, and that's fine because middleware.ts refreshes the session on every request.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware refreshes the session.
          }
        },
      },
    }
  );
}
