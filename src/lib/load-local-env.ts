import { existsSync } from "node:fs";

/**
 * Loads `.env.local` into process.env for standalone `node scripts/*.ts` runs.
 *
 * Next.js loads .env.local automatically for `next dev` / `next build`, but a bare `node`
 * process does NOT — so scripts (embed-laws, query-laws) must load it explicitly or they see
 * `OPENAI_API_KEY is not set` even though the key is in .env.local. Like Node's `--env-file`,
 * `process.loadEnvFile` does not override variables already present in the real environment,
 * so a value exported in the shell still wins. No-op if .env.local is absent.
 */
export function loadLocalEnv(): void {
  if (existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  }
}
