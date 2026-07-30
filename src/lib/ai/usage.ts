/**
 * Claude usage normalization + cost/savings math for prompt-caching telemetry.
 *
 * ⚠️ Field-shape gotcha (verified against ai@7 + @ai-sdk/anthropic@4): the cache token counts are
 * NOT at `providerMetadata.anthropic.cacheReadInputTokens`. They live in two places:
 *   - `usage.inputTokenDetails` (AI-SDK-normalized, camelCase): { noCacheTokens, cacheReadTokens,
 *     cacheWriteTokens } — and here `usage.inputTokens` is the TOTAL (noCache + cacheRead + write).
 *   - `providerMetadata.anthropic.usage` (raw Anthropic, snake_case): { input_tokens (=uncached),
 *     cache_read_input_tokens, cache_creation_input_tokens }.
 * We prefer inputTokenDetails and fall back to the raw block. `ClaudeUsage.inputTokens` below is the
 * UNCACHED (full-price) count, so calculateCost adds cacheRead/cacheWrite on top without double-counting.
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

interface UsageShape {
  inputTokens?: number;
  outputTokens?: number;
  inputTokenDetails?: {
    noCacheTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
}

const rawAnthropicUsage = (pm: ProviderMetadata | undefined) =>
  ((pm?.anthropic as { usage?: Record<string, number> } | undefined)?.usage ?? {}) as {
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };

/** Normalize the AI SDK's usage + provider metadata into a flat token record (uncached input). */
export function extractUsage(
  usage: UsageShape | undefined,
  providerMetadata: ProviderMetadata | undefined
): ClaudeUsage {
  const details = usage?.inputTokenDetails;
  const raw = rawAnthropicUsage(providerMetadata);

  const cacheReadTokens = details?.cacheReadTokens ?? raw.cache_read_input_tokens ?? 0;
  const cacheCreationTokens = details?.cacheWriteTokens ?? raw.cache_creation_input_tokens ?? 0;

  // `usage.inputTokens` is the TOTAL (incl. cached) in ai@7; derive the uncached, full-price part.
  const totalInput = usage?.inputTokens ?? 0;
  const inputTokens = details?.noCacheTokens ?? Math.max(0, totalInput - cacheReadTokens - cacheCreationTokens);

  return {
    inputTokens,
    outputTokens: usage?.outputTokens ?? 0,
    cacheCreationTokens,
    cacheReadTokens,
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
