/**
 * Offline smoke test for the RAG ask pipeline: embed question → retrieve (contract in-memory
 * from the fixture via cosine + law from Supabase via match_law_chunks) → build grounded prompt
 * → Claude answer. Mirrors /api/contracts/[id]/ask without auth/DB-contract rows.
 *
 *   pnpm ask:sample                        (default question)
 *   pnpm ask:sample "האם גובה הערבות חוקי?"  (custom question)
 */
import { readFileSync } from "node:fs";
import { loadLocalEnv } from "../src/lib/load-local-env.ts";
import { extractPdfText } from "../src/lib/pdf/extract.ts";
import { chunkContract } from "../src/lib/chunking/contract-chunker.ts";
import { embedText, embedTexts } from "../src/lib/embeddings/openai.ts";
import { cosineSimilarity } from "../src/lib/rag/cosine.ts";
import {
  buildRagPrompt,
  MIN_SIMILARITY,
  CONTRACT_MIN_HITS,
  type LawContextItem,
} from "../src/lib/rag/prompt.ts";
import { getSupabaseAdmin } from "../src/lib/supabase/admin.ts";

const FIXTURE = "fixtures/sample-rental-contract.pdf";
// Uses "ערובה" (the term the corpus + contract use). A "פיקדון" phrasing hits the documented
// lexical gap (see TODO.md / P1) and falls back to law-only — pass it explicitly to see that.
const DEFAULT_Q = "האם גובה הערובה שנדרשה בחוזה חוקי?";
const TOP_K = 6;

interface LawRpcRow {
  short_title: string;
  section_number: string;
  text: string;
  similarity: number;
}

async function main(): Promise<void> {
  loadLocalEnv();
  const question = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? DEFAULT_Q;

  // ---- Contract side: chunk + embed the fixture in memory, rank by cosine ----
  const bytes = new Uint8Array(readFileSync(FIXTURE));
  const { text } = await extractPdfText(bytes);
  const chunks = chunkContract(text);
  const [chunkEmbeddings, qEmbedding] = await Promise.all([
    embedTexts(chunks.map((c) => c.text)),
    embedText(question),
  ]);

  const contractRanked = chunks
    .map((c, i) => ({ ...c, similarity: cosineSimilarity(qEmbedding, chunkEmbeddings[i]) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, TOP_K)
    .filter((c) => c.similarity >= MIN_SIMILARITY);

  // ---- Law side: match_law_chunks via service-role admin (bypasses RLS) ----
  const admin = getSupabaseAdmin();
  const { data: lawData, error } = await admin.rpc("match_law_chunks", {
    p_query_embedding: qEmbedding,
    p_match_count: TOP_K,
  });
  if (error) throw new Error(`match_law_chunks failed: ${error.message}`);
  const lawHits = ((lawData ?? []) as LawRpcRow[]).filter((h) => h.similarity >= MIN_SIMILARITY);

  const contractItems =
    contractRanked.length >= CONTRACT_MIN_HITS
      ? contractRanked.map((c) => ({
          section_number: c.section_number,
          text: c.text,
          similarity: c.similarity,
        }))
      : [];
  if (contractRanked.length < CONTRACT_MIN_HITS) {
    console.warn(`[ask:sample] weak contract retrieval (${contractRanked.length}) → law-only fallback`);
  }

  const lawItems: LawContextItem[] = lawHits.map((h) => ({
    short_title: h.short_title,
    section_number: h.section_number,
    text: h.text,
    similarity: h.similarity,
  }));

  const { system, prompt, sources } = buildRagPrompt(question, lawItems, contractItems);

  console.log(`\n[ask:sample] Q: ${question}\n`);
  console.log("[ask:sample] retrieved sources:");
  for (const s of sources) {
    console.log(`  [${s.marker}] ${s.type.padEnd(8)} ${s.label}  (sim ${s.similarity.toFixed(3)})`);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.example).");
  }
  // Dynamic import AFTER loadLocalEnv so the provider captures the now-loaded API key.
  const { createAnthropic } = await import("@ai-sdk/anthropic");
  const { generateText } = await import("ai");
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { text: answer } = await generateText({
    model: anthropic("claude-sonnet-5"),
    system,
    prompt,
    // claude-sonnet-5 does not support `temperature` (AI SDK warns + ignores it).
    maxOutputTokens: 1024,
  });

  console.log("\n[ask:sample] Claude answer:\n");
  console.log(answer);
}

main().catch((err) => {
  console.error("[ask:sample] FAILED:", err);
  process.exitCode = 1;
});
