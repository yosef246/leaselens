/**
 * Read the most recent ai_usage_logs rows from PROD (service role) and confirm caching actually
 * engaged (cache_read_tokens > 0) on the latest review/rewrite/ask calls. The production counterpart
 * to `pnpm test:caching` (which proves the mechanism locally); this proves it in the wild.
 *
 *   pnpm check:telemetry
 */
import { loadLocalEnv } from "../src/lib/load-local-env.ts";
import { getSupabaseAdmin } from "../src/lib/supabase/admin.ts";

loadLocalEnv();

const supabase = getSupabaseAdmin();
const { data, error } = await supabase
  .from("ai_usage_logs")
  .select(
    "created_at, endpoint, model, input_tokens, cache_creation_tokens, cache_read_tokens, output_tokens, estimated_cost_usd, cache_hit_ratio"
  )
  .order("created_at", { ascending: false })
  .limit(15);

if (error) {
  console.error("query failed:", error.message);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log("ai_usage_logs is EMPTY — no logging-enabled AI call has run yet.");
  process.exit(0);
}

console.log(`\nLatest ${data.length} ai_usage_logs rows (newest first):\n`);
for (const r of data) {
  const t = new Date(r.created_at).toLocaleString("he-IL");
  console.log(
    `${t}  ${String(r.endpoint).padEnd(7)}  in=${r.input_tokens}  ` +
      `cache_write=${r.cache_creation_tokens}  cache_read=${r.cache_read_tokens}  ` +
      `out=${r.output_tokens}  hit=${(r.cache_hit_ratio * 100).toFixed(0)}%  ` +
      `$${Number(r.estimated_cost_usd).toFixed(5)}`
  );
}

const withRead = data.filter((r) => (r.cache_read_tokens ?? 0) > 0).length;
console.log(
  `\n${withRead}/${data.length} rows have cache_read > 0 ` +
    (withRead > 0 ? "✅ caching is engaging in production." : "⚠️ no cache reads yet.")
);
