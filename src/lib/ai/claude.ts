/**
 * Central helpers for every Claude call in the app (all of which go through the Vercel AI SDK).
 *
 * 1. `cachedSystem(system)` — wraps a system prompt as a SystemModelMessage carrying Anthropic
 *    prompt-caching (`cacheControl: ephemeral`). The system prompt is the one byte-stable prefix
 *    shared across every request, so caching it lets repeat calls read it at ~0.1x instead of full
 *    input price. Pass the result straight to `streamText`/`generateObject`'s `system` field.
 *
 *    Deliberately NOT cached: the retrieved law/contract chunks (they vary per question — this is a
 *    RAG app, not full-context) and the user's contract text. A 1-hour TTL isn't used because the
 *    only cached content is the always-warm shared system prompt, for which 5m never expires under
 *    real traffic. See docs note in the caching PR.
 *
 *    ⚠️ Caching only activates once the cached prefix clears Anthropic's minimum (~1024 tokens for
 *    Sonnet). If a system prompt is shorter, `cacheCreationInputTokens` stays 0 — the ai_usage_logs
 *    rows are how you verify it actually kicked in.
 *
 * 2. `logClaudeUsage(...)` — normalizes usage → cost/savings → console line + ai_usage_logs row.
 */
import type { SystemModelMessage } from "ai";
import { calculateCost, type ClaudeUsage } from "@/lib/ai/usage";
import { insertAiUsageLog } from "@/lib/db/ai-usage";

export const CLAUDE_MODEL = "claude-sonnet-5";

export function cachedSystem(system: string): SystemModelMessage {
  return {
    role: "system",
    content: system,
    providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
  };
}

export async function logClaudeUsage(params: {
  contractId: string;
  endpoint: "ask" | "review" | "rewrite";
  usage: ClaudeUsage;
  model?: string;
}): Promise<void> {
  const { contractId, endpoint, usage } = params;
  const model = params.model ?? CLAUDE_MODEL;
  const { estimatedCostUsd, cacheHitRatio, savingsPct } = calculateCost(usage);

  // Live monitoring line (Vercel function logs).
  console.log(
    `[ai_usage] ${endpoint} contract=${contractId} model=${model} ` +
      `input=${usage.inputTokens} cache_write=${usage.cacheCreationTokens} ` +
      `cache_read=${usage.cacheReadTokens} output=${usage.outputTokens} ` +
      `cost=$${estimatedCostUsd.toFixed(6)} cache_hit=${(cacheHitRatio * 100).toFixed(1)}% ` +
      `input_savings=${(savingsPct * 100).toFixed(1)}%`
  );

  try {
    await insertAiUsageLog({
      contractId,
      endpoint,
      model,
      inputTokens: usage.inputTokens,
      cacheCreationTokens: usage.cacheCreationTokens,
      cacheReadTokens: usage.cacheReadTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd,
      cacheHitRatio,
    });
  } catch (err) {
    // Telemetry must never break the user-facing flow.
    console.warn(`[ai_usage] persist failed: ${err instanceof Error ? err.message : err}`);
  }
}
