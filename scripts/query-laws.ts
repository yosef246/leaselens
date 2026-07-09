/**
 * P1 acceptance helper: embed a Hebrew query and return the top matching law sections via the
 * match_law_chunks RPC. Verifies the MASTER_PROMPT P1 ✅ ("החזר פיקדון" returns sensible matches).
 * Requires: migration 0001 applied + `pnpm embed-laws` already run + OPENAI_API_KEY in .env.local.
 *
 *   node scripts/query-laws.ts                 (default query: "החזר פיקדון")
 *   node scripts/query-laws.ts "פינוי שוכר"     (custom query)
 *   pnpm query-laws "..."
 */
import { loadLocalEnv } from "../src/lib/load-local-env.ts";
import { embedText } from "../src/lib/embeddings/openai.ts";
import { getSupabaseAdmin } from "../src/lib/supabase/admin.ts";

async function main() {
  loadLocalEnv();
  const query = process.argv.slice(2).join(" ").trim() || "החזר פיקדון";
  const matchCount = 5;

  console.log(`[query-laws] query: "${query}"  (top ${matchCount})\n`);

  const embedding = await embedText(query);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("match_law_chunks", {
    p_query_embedding: embedding,
    p_match_count: matchCount,
  });

  if (error) {
    throw new Error(`match_law_chunks RPC failed: ${error.message}`);
  }
  if (!data || data.length === 0) {
    console.log("[query-laws] No matches. Is law_chunks populated? Run `pnpm embed-laws` first.");
    return;
  }

  for (const [i, row] of (data as Record<string, unknown>[]).entries()) {
    const sim =
      typeof row.similarity === "number" ? (row.similarity as number).toFixed(3) : row.similarity;
    const snippet = String(row.text).replace(/\s+/g, " ").slice(0, 120);
    console.log(
      `${i + 1}. [${sim}] ${row.short_title} · סעיף ${row.section_number}` +
        (row.section_title ? ` — ${row.section_title}` : "") +
        (row.chapter ? `  (${row.chapter})` : "")
    );
    console.log(`     ${snippet}…\n`);
  }
}

main().catch((err) => {
  console.error("[query-laws] FAILED:", err);
  process.exit(1);
});
