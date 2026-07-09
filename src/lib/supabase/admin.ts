/**
 * Service-role Supabase client for SERVER-SIDE BUILD SCRIPTS ONLY (currently: scripts/embed-laws.ts).
 *
 * D4 nuance (see docs/DECISIONS.md D4): D4's userId-scoped `src/lib/db/*.ts` layer (mandatory
 * `userId` first parameter, no direct `supabase.from(...)` outside that layer) governs USER data
 * (contracts / contract_chunks / red_flags) and is a P5 precondition. `law_chunks` is GLOBAL,
 * unscoped reference data -- it has no `user_id` column and nothing to filter by -- and this
 * module is imported only by a one-shot build script (`node scripts/embed-laws.ts`), never by an
 * `app/api/**` route. A direct service-role client here is therefore correct and does NOT
 * violate D4; it is not the pattern to copy for any future user-data access.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env.local (see .env.example).");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (see .env.example).");
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}
