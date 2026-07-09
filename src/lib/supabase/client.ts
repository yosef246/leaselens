/**
 * Browser (client component) Supabase client — anon key, session in cookies.
 *
 * Auth/session only. This is NOT the user-data access layer (D4): user tables
 * (contracts / contract_chunks / red_flags) go through src/lib/db/*.ts with a
 * mandatory userId first param. Reads NEXT_PUBLIC_* only — never the service-role key.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
