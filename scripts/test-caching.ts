/**
 * Verifies Anthropic prompt caching end-to-end via the Vercel AI SDK.
 *
 * Fires 5 SEQUENTIAL calls that share one byte-identical (cache-controlled) system prompt:
 *   - call 1  → cache_creation high, cache_read = 0   (writes the cache)
 *   - calls 2-5 → cache_creation = 0, cache_read high (served from cache)
 * Then prints a table + the cost with vs. without caching.
 *
 * Sequential on purpose: the cache is only readable after the first response starts, so parallel
 * calls would all miss (see Anthropic caching docs). Costs real tokens — needs ANTHROPIC_API_KEY.
 *
 *   pnpm test:caching
 *
 * NOTE: caching only activates once the cached prefix clears Anthropic's ~1024-token minimum for
 * Sonnet. The demo system prompt below is deliberately padded past that so the mechanism is
 * visible; the app's real system prompts must likewise clear the threshold for caching to help
 * (the ai_usage_logs table is how you confirm it in production).
 */
import { loadLocalEnv } from "../src/lib/load-local-env.ts";
import { extractUsage, calculateCost, sumUsage, type ClaudeUsage } from "../src/lib/ai/usage.ts";

loadLocalEnv();

const MODEL = "claude-sonnet-5";
const RUNS = 5;

// Padded > ~1024 tokens so the cache actually engages for this demonstration.
const SYSTEM_TEXT = [
  "אתה עוזר משפטי המתמחה בחוזי שכירות למגורים בישראל.",
  "עליך לנתח סעיפי חוזה מול חוק השכירות והשאילה, חוק החוזים האחידים, חוק המקרקעין וחוק הגנת הדייר.",
  Array.from(
    { length: 60 },
    (_, i) =>
      `כלל ${i + 1}: הסתמך אך ורק על מקורות מצוטטים, ענה בעברית ברורה ותכליתית, ואל תמציא סעיפי חוק או עובדות שאינן נתמכות במקורות שסופקו.`
  ).join("\n"),
].join("\n");

const QUESTION = "סכם בשורה אחת מהי תקרת הפיקדון לפי החוק.";

async function main() {
  const { createAnthropic } = await import("@ai-sdk/anthropic");
  const { generateText } = await import("ai");
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = {
    role: "system" as const,
    content: SYSTEM_TEXT,
    providerOptions: { anthropic: { cacheControl: { type: "ephemeral" as const } } },
  };

  const usages: ClaudeUsage[] = [];
  console.log(`Running ${RUNS} sequential calls (model=${MODEL})…\n`);
  console.log("call │ input │ cache_write │ cache_read │ output │ cost($)");
  console.log("─────┼───────┼─────────────┼────────────┼────────┼─────────");

  for (let i = 1; i <= RUNS; i++) {
    const { usage, providerMetadata } = await generateText({
      model: anthropic(MODEL),
      system,
      prompt: QUESTION,
      maxOutputTokens: 128,
    });
    const u = extractUsage(usage, providerMetadata);
    usages.push(u);
    const { estimatedCostUsd } = calculateCost(u);
    console.log(
      `  ${i}  │ ${String(u.inputTokens).padStart(5)} │ ${String(u.cacheCreationTokens).padStart(11)} │ ` +
        `${String(u.cacheReadTokens).padStart(10)} │ ${String(u.outputTokens).padStart(6)} │ ${estimatedCostUsd.toFixed(6)}`
    );
  }

  const total = sumUsage(usages);
  const { estimatedCostUsd, cacheHitRatio, savingsPct } = calculateCost(total);
  // Hypothetical: same token volume with every cached token paid at full input price, no writes.
  const totalInput = total.inputTokens + total.cacheCreationTokens + total.cacheReadTokens;
  const noCache = calculateCost({
    inputTokens: totalInput,
    outputTokens: total.outputTokens,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  });

  console.log("\n── Totals ──");
  console.log(`input=${total.inputTokens}  cache_write=${total.cacheCreationTokens}  cache_read=${total.cacheReadTokens}  output=${total.outputTokens}`);
  console.log(`cache hit ratio (input): ${(cacheHitRatio * 100).toFixed(1)}%`);
  console.log(`cost WITH caching:    $${estimatedCostUsd.toFixed(6)}`);
  console.log(`cost WITHOUT caching: $${noCache.estimatedCostUsd.toFixed(6)}`);
  console.log(`input-token savings:  ${(savingsPct * 100).toFixed(1)}%`);

  if (total.cacheReadTokens === 0) {
    console.log("\n⚠️  cache_read stayed 0 across all runs — the cached prefix never engaged.");
    console.log("    Likely under the ~1024-token minimum, or a byte-difference invalidated the prefix.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
