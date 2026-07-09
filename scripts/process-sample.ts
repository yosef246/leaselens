/**
 * Smoke test for the contract pipeline: pdf-parse → scanned check → hybrid chunker → embeddings.
 * Runs offline against fixtures/sample-rental-contract.pdf (no DB, no auth). Prints stats so a
 * regression in extraction or chunking is obvious.
 *
 *   pnpm process:sample              (full pipeline incl. OpenAI embeddings)
 *   pnpm process:sample --no-embed   (parse + chunk only, no network)
 */
import { readFileSync } from "node:fs";
import { loadLocalEnv } from "../src/lib/load-local-env.ts";
import { extractPdfText, isLikelyScanned } from "../src/lib/pdf/extract.ts";
import { chunkContract } from "../src/lib/chunking/contract-chunker.ts";

const FIXTURE = "fixtures/sample-rental-contract.pdf";

async function main(): Promise<void> {
  loadLocalEnv();
  const bytes = new Uint8Array(readFileSync(FIXTURE));

  const { text, pages } = await extractPdfText(bytes);
  console.log(`[process:sample] ${FIXTURE} — ${bytes.byteLength} bytes, ${pages} page(s)`);
  console.log(`[process:sample] extracted ${text.length} chars; scanned? ${isLikelyScanned(text, bytes.byteLength)}`);
  console.log("---- first 300 chars ----");
  console.log(text.slice(0, 300));
  console.log("-------------------------");

  const chunks = chunkContract(text);
  const numbered = chunks.filter((c) => c.section_number !== null).length;
  console.log(`\n[process:sample] chunks: ${chunks.length} (numbered: ${numbered}, fallback: ${chunks.length - numbered})`);
  for (const c of chunks.slice(0, 6)) {
    console.log(`  [${c.chunk_index}] §${c.section_number ?? "-"}: ${c.text.slice(0, 70).replace(/\n/g, " ")}`);
  }

  if (process.argv.includes("--no-embed")) {
    console.log("\n[process:sample] --no-embed: skipping OpenAI.");
    return;
  }

  const { embedTexts, EMBEDDING_DIMENSIONS } = await import("../src/lib/embeddings/openai.ts");
  const embeddings = await embedTexts(chunks.map((c) => c.text));
  const dims = embeddings[0]?.length ?? 0;
  const ok = embeddings.length === chunks.length && dims === EMBEDDING_DIMENSIONS;
  console.log(`\n[process:sample] embeddings: ${embeddings.length} vectors × ${dims} dims — ${ok ? "OK ✓" : "MISMATCH ✗"}`);
}

main().catch((err) => {
  console.error("[process:sample] FAILED:", err);
  process.exitCode = 1;
});
