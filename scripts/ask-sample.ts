/**
 * Offline smoke test for the HYBRID RAG ask pipeline: embed + keyword-expand question →
 * retrieve (contract in-memory via cosine+keyword RRF; law from Supabase via
 * match_law_chunks_hybrid) → build grounded prompt → Claude answer. Mirrors
 * /api/contracts/[id]/ask without auth/DB-contract rows. Requires migration 0007 applied.
 *
 *   pnpm ask:sample                          (default question)
 *   pnpm ask:sample "האם סעיף הפיקדון חוקי?"   (custom question)
 */
import { readFileSync } from "node:fs";
import { loadLocalEnv } from "../src/lib/load-local-env.ts";
import { extractPdfText } from "../src/lib/pdf/extract.ts";
import { chunkContract } from "../src/lib/chunking/contract-chunker.ts";
import { embedText, embedTexts } from "../src/lib/embeddings/openai.ts";
import { cosineSimilarity } from "../src/lib/rag/cosine.ts";
import { expandQueryTerms, buildKeywordQuery } from "../src/lib/rag/query.ts";
import {
  buildRagPrompt,
  MIN_SIMILARITY,
  CONTRACT_MIN_HITS,
  type LawContextItem,
} from "../src/lib/rag/prompt.ts";
import { getSupabaseAdmin } from "../src/lib/supabase/admin.ts";

const FIXTURE = "fixtures/sample-rental-contract.pdf";
const DEFAULT_Q = "האם סעיף הפיקדון חוקי?";
const TOP_K = 6;
const RRF_K = 50;

interface LawRpcRow {
  short_title: string;
  section_number: string;
  text: string;
  similarity: number;
  keyword_matched: boolean;
}

/** Approximate the tsvector keyword arm in memory: count how many expanded terms appear. */
function keywordHits(text: string, terms: string[]): number {
  return terms.reduce((n, t) => (text.includes(t) ? n + 1 : n), 0);
}

async function main(): Promise<void> {
  loadLocalEnv();
  const question = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? DEFAULT_Q;
  const terms = expandQueryTerms(question);
  const keywordQuery = buildKeywordQuery(question);

  // ---- Contract side: chunk + embed in memory, fuse vector + keyword with RRF ----
  const bytes = new Uint8Array(readFileSync(FIXTURE));
  const { text } = await extractPdfText(bytes);
  const chunks = chunkContract(text);
  const [chunkEmbeddings, qEmbedding] = await Promise.all([
    embedTexts(chunks.map((c) => c.text)),
    embedText(question),
  ]);

  const vecRank = new Map<number, number>();
  chunks
    .map((_, i) => ({ i, sim: cosineSimilarity(qEmbedding, chunkEmbeddings[i]) }))
    .sort((a, b) => b.sim - a.sim)
    .forEach((r, idx) => vecRank.set(r.i, idx + 1));

  const kwRank = new Map<number, number>();
  chunks
    .map((c, i) => ({ i, hits: keywordHits(c.text, terms) }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .forEach((r, idx) => kwRank.set(r.i, idx + 1));

  const contractFused = chunks
    .map((c, i) => ({
      section_number: c.section_number,
      text: c.text,
      similarity: cosineSimilarity(qEmbedding, chunkEmbeddings[i]),
      keyword_matched: kwRank.has(i),
      rrf:
        (vecRank.has(i) ? 1 / (RRF_K + vecRank.get(i)!) : 0) +
        (kwRank.has(i) ? 1 / (RRF_K + kwRank.get(i)!) : 0),
    }))
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, TOP_K);

  const relevant = (h: { similarity: number; keyword_matched: boolean }) =>
    h.similarity >= MIN_SIMILARITY || h.keyword_matched;

  // ---- Law side: hybrid RPC via service-role admin (bypasses RLS) ----
  const admin = getSupabaseAdmin();
  const { data: lawData, error } = await admin.rpc("match_law_chunks_hybrid", {
    p_query_embedding: qEmbedding,
    p_query_text: keywordQuery,
    p_match_count: TOP_K,
  });
  if (error) throw new Error(`match_law_chunks_hybrid failed: ${error.message}`);
  const lawHits = ((lawData ?? []) as LawRpcRow[]).filter(relevant);

  const contractRelevant = contractFused.filter(relevant);
  const contractItems =
    contractRelevant.length >= CONTRACT_MIN_HITS
      ? contractRelevant.map((c) => ({
          section_number: c.section_number,
          text: c.text,
          similarity: c.similarity,
        }))
      : [];
  if (contractRelevant.length < CONTRACT_MIN_HITS) {
    console.warn(`[ask:sample] weak contract retrieval (${contractRelevant.length}) → law-only fallback`);
  }

  const lawItems: LawContextItem[] = lawHits.map((h) => ({
    short_title: h.short_title,
    section_number: h.section_number,
    text: h.text,
    similarity: h.similarity,
  }));

  const { system, prompt, sources } = buildRagPrompt(question, lawItems, contractItems);

  const kwLawSections = new Set(lawHits.filter((h) => h.keyword_matched).map((h) => h.section_number));

  console.log(`\n[ask:sample] Q: ${question}`);
  console.log(`[ask:sample] keyword query: ${keywordQuery || "(none)"}\n`);
  console.log("[ask:sample] retrieved sources:");
  for (const s of sources) {
    const kw = s.type === "law" && kwLawSections.has(s.section_number ?? "") ? " [kw]" : "";
    console.log(`  [${s.marker}] ${s.type.padEnd(8)} ${s.label}  (sim ${s.similarity.toFixed(3)})${kw}`);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.example).");
  }
  // Dynamic import AFTER loadLocalEnv so the provider captures the now-loaded API key.
  const { createAnthropic } = await import("@ai-sdk/anthropic");
  const { generateText } = await import("ai");
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { text: answer, finishReason, usage } = await generateText({
    model: anthropic("claude-sonnet-5"),
    system,
    prompt,
    // claude-sonnet-5 does not support `temperature` (AI SDK warns + ignores it).
    maxOutputTokens: 2048,
  });

  console.log(
    `\n[ask:sample] finishReason=${finishReason} outputTokens=${usage?.outputTokens ?? "?"} (maxOutputTokens=2048)`
  );
  console.log("[ask:sample] Claude answer:\n");
  console.log(answer);
}

main().catch((err) => {
  console.error("[ask:sample] FAILED:", err);
  process.exitCode = 1;
});
