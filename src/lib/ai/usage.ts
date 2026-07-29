/**
 * Claude usage normalization + cost/savings math for prompt-caching telemetry.
 *
 * The Vercel AI SDK reports token usage on `result.usage` (inputTokens/outputTokens) and the
 * Anthropic-specific cache counts on `result.providerMetadata.anthropic`
 * (cacheCreationInputTokens / cacheReadInputTokens). At the API level, `inputTokens` is the
 * UNCACHED remainder — total input = input + cacheCreation + cacheRead (see Anthropic caching docs).
 */
import type { ProviderMetadata } from "ai";

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface CostBreakdown {
  estimatedCostUsd: number;
  cacheHitRatio: number; // cacheRead / total input tokens (0..1)
  savingsPct: number; // input-cost saved vs. the same request with no caching (0..1)
}

/**
 * Claude Sonnet 5 pricing, USD per million tokens (standard rates). Cache write is the 5-minute
 * TTL premium (1.25x input); cache read is 0.1x input. NOTE: an introductory input/output rate of
 * $2 / $10 applies through 2026-08-31 — the savings *percentage* is identical under either base
 * (it's a ratio), only the absolute USD differs. We use standard rates as the durable default;
 * flip these two constants to 2 / 10 if you want the log to match today's intro billing exactly.
 */
const PRICE_INPUT = 3;
const PRICE_OUTPUT = 15;
const PRICE_CACHE_WRITE = 3.75; // 1.25 x input
const PRICE_CACHE_READ = 0.3; // 0.1 x input

const anthropicMeta = (pm: ProviderMetadata | undefined) =>
  (pm?.anthropic ?? {}) as {
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  };

/** Normalize the AI SDK's usage + provider metadata into a flat token record. */
export function extractUsage(
  usage: { inputTokens?: number; outputTokens?: number } | undefined,
  providerMetadata: ProviderMetadata | undefined
): ClaudeUsage {
  const meta = anthropicMeta(providerMetadata);
  return {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cacheCreationTokens: meta.cacheCreationInputTokens ?? 0,
    cacheReadTokens: meta.cacheReadInputTokens ?? 0,
  };
}

/** Sum a list of usages (used to aggregate the per-section calls of a /review run into one row). */
export function sumUsage(items: ClaudeUsage[]): ClaudeUsage {
  return items.reduce<ClaudeUsage>(
    (acc, u) => ({
      inputTokens: acc.inputTokens + u.inputTokens,
      outputTokens: acc.outputTokens + u.outputTokens,
      cacheCreationTokens: acc.cacheCreationTokens + u.cacheCreationTokens,
      cacheReadTokens: acc.cacheReadTokens + u.cacheReadTokens,
    }),
    { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 }
  );
}

export function calculateCost(u: ClaudeUsage): CostBreakdown {
  const perMillion = (tokens: number, price: number) => (tokens * price) / 1_000_000;

  const inputCost =
    perMillion(u.inputTokens, PRICE_INPUT) +
    perMillion(u.cacheCreationTokens, PRICE_CACHE_WRITE) +
    perMillion(u.cacheReadTokens, PRICE_CACHE_READ);
  const outputCost = perMillion(u.outputTokens, PRICE_OUTPUT);
  const estimatedCostUsd = inputCost + outputCost;

  const totalInput = u.inputTokens + u.cacheCreationTokens + u.cacheReadTokens;
  const cacheHitRatio = totalInput > 0 ? u.cacheReadTokens / totalInput : 0;

  // What the input would have cost with no caching (every cached/written token at full input price).
  const noCacheInputCost = perMillion(totalInput, PRICE_INPUT);
  const savingsPct = noCacheInputCost > 0 ? (noCacheInputCost - inputCost) / noCacheInputCost : 0;

  return { estimatedCostUsd, cacheHitRatio, savingsPct };
}
