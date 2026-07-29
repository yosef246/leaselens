/**
 * Insert layer for `ai_usage_logs`. RLS scopes the write to the caller via the parent contract,
 * so this runs on the request-scoped server client. Best-effort telemetry — callers wrap it so a
 * logging failure never breaks the user-facing AI flow.
 */
import { createClient } from "@/lib/supabase/server";

export interface AiUsageLogInput {
  contractId: string;
  endpoint: "ask" | "review" | "rewrite";
  model: string;
  inputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  cacheHitRatio: number;
}

export async function insertAiUsageLog(input: AiUsageLogInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("ai_usage_logs").insert({
    contract_id: input.contractId,
    endpoint: input.endpoint,
    model: input.model,
    input_tokens: input.inputTokens,
    cache_creation_tokens: input.cacheCreationTokens,
    cache_read_tokens: input.cacheReadTokens,
    output_tokens: input.outputTokens,
    estimated_cost_usd: input.estimatedCostUsd,
    cache_hit_ratio: input.cacheHitRatio,
  });
  if (error) throw new Error(`insertAiUsageLog failed: ${error.message}`);
}
