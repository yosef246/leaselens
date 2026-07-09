/**
 * Idempotent embedding pipeline for the P1 law corpus.
 *
 * Manifest-driven per docs/DECISIONS.md D1-AMENDED: iterates data/laws/manifest.json's
 * `documents` map -- NEVER a directory glob. A `.txt` on disk that isn't in the manifest is
 * silently ignored (and should not exist).
 *
 * Usage:
 *   node scripts/embed-laws.ts              (LIVE: embeds via OpenAI, upserts to Supabase)
 *   node scripts/embed-laws.ts --dry-run    (chunks only -- no OpenAI, no Supabase, no network)
 *
 * (also wired as `pnpm embed-laws` / `pnpm embed-laws:dry`, see package.json)
 *
 * Idempotency: upserts on the `(law_name, section_number)` unique constraint (see
 * supabase/migrations/0001_law_chunks.sql), so re-running updates rows in place instead of
 * duplicating them.
 */
import { readFileSync } from "node:fs";
import { loadLocalEnv } from "../src/lib/load-local-env.ts";
import {
  getManifestDocuments,
  resolveLawFilePath,
  type LawManifestDocument,
} from "../src/lib/laws/manifest.ts";
import { classifyLaw } from "../src/lib/laws/mapping.ts";
import { chunkHebrewLaw, type LawChunk } from "../src/lib/chunking/hebrew-law-chunker.ts";

const DRY_RUN = process.argv.includes("--dry-run");
const UPSERT_BATCH_SIZE = 200;

/**
 * The text we send to the embedding model for a chunk: BODY ONLY.
 *
 * Two experiments PROVED that prepending metadata regresses retrieval with
 * text-embedding-3-small (which is lexical, not semantic, on Hebrew):
 *   1. title + sign + chapter → חוק הערבות dominated on "ערבות", §25י dropped.
 *   2. title only (P2)         → same failure: on Q1 ("השבת ערבות בסיום שכירות")
 *      §25י fell out of top-5 entirely; חוק הערבות §2 took #1 (sim 0.536) purely on the
 *      word "ערבות"/"ערב". Body-only keeps §25י at #1 (sim 0.482).
 * The real lexical-gap fix lives in P3 (hybrid keyword+vector) — see TODO.md.
 */
function buildEmbedInput(row: PreparedRow): string {
  return row.text;
}

interface PreparedRow {
  law_name: string;
  short_title: string;
  law_year: number;
  section_number: string;
  section_title: string | null;
  chapter: string | null;
  sign: string | null;
  amendment: string | null;
  category: string;
  is_binding: boolean;
  text: string;
}

function prepareRows(doc: LawManifestDocument, chunks: LawChunk[]): PreparedRow[] {
  const { category, is_binding } = classifyLaw(doc);
  return chunks.map((c) => ({
    law_name: doc.title,
    short_title: doc.short_title,
    law_year: doc.year,
    section_number: c.section_number,
    section_title: c.section_title,
    chapter: c.chapter,
    sign: c.sign,
    amendment: c.amendment,
    category,
    is_binding,
    text: c.text,
  }));
}

async function main(): Promise<void> {
  loadLocalEnv();
  const documents = getManifestDocuments();
  if (documents.length === 0) {
    console.error("[embed-laws] No documents found in data/laws/manifest.json -- aborting.");
    process.exitCode = 1;
    return;
  }

  console.log(`[embed-laws] mode: ${DRY_RUN ? "DRY RUN (no OpenAI / no Supabase calls)" : "LIVE"}`);
  console.log(`[embed-laws] ${documents.length} laws declared in manifest\n`);

  const perLawCounts: { fileName: string; shortTitle: string; chunks: number }[] = [];
  const allRows: PreparedRow[] = [];
  let sampleChunk: { doc: LawManifestDocument; chunk: LawChunk } | null = null;

  for (const doc of documents) {
    const filePath = resolveLawFilePath(doc.fileName);
    let rawText: string;
    try {
      rawText = readFileSync(filePath, "utf-8");
    } catch {
      console.error(
        `[embed-laws] MISSING FILE: ${filePath} (listed in manifest as "${doc.fileName}"). ` +
          `Per DECISIONS.md D1/D1-AMENDED, P1 is not done until the real .txt files exist.`
      );
      process.exitCode = 1;
      return;
    }

    const { chunks } = chunkHebrewLaw(rawText);
    perLawCounts.push({ fileName: doc.fileName, shortTitle: doc.short_title, chunks: chunks.length });

    if (!sampleChunk && chunks.length > 0) {
      // Prefer a chunk that shows off chapter/sign/amendment metadata for the sample dump.
      const rich = chunks.find((c) => c.section_title && c.chapter && c.amendment) ??
        chunks.find((c) => c.section_title && c.chapter) ??
        chunks[0];
      sampleChunk = { doc, chunk: rich };
    }

    allRows.push(...prepareRows(doc, chunks));
  }

  console.log("Per-law chunk counts:");
  const nameWidth = Math.max(...perLawCounts.map((r) => r.fileName.length)) + 2;
  const titleWidth = Math.max(...perLawCounts.map((r) => r.shortTitle.length)) + 2;
  for (const row of perLawCounts) {
    console.log(
      `  ${row.fileName.padEnd(nameWidth)}${row.shortTitle.padEnd(titleWidth)}${row.chunks} chunks`
    );
  }
  const total = perLawCounts.reduce((sum, r) => sum + r.chunks, 0);
  console.log(`\nTOTAL: ${total} chunks across ${perLawCounts.length} laws\n`);

  if (sampleChunk) {
    const classification = classifyLaw(sampleChunk.doc);
    const preview =
      sampleChunk.chunk.text.length > 300
        ? `${sampleChunk.chunk.text.slice(0, 300)}…`
        : sampleChunk.chunk.text;
    console.log("Sample chunk:");
    console.log(
      JSON.stringify(
        {
          law_name: sampleChunk.doc.title,
          short_title: sampleChunk.doc.short_title,
          law_year: sampleChunk.doc.year,
          category: classification.category,
          is_binding: classification.is_binding,
          section_number: sampleChunk.chunk.section_number,
          section_title: sampleChunk.chunk.section_title,
          chapter: sampleChunk.chunk.chapter,
          sign: sampleChunk.chunk.sign,
          amendment: sampleChunk.chunk.amendment,
          text: preview,
        },
        null,
        2
      )
    );
  }

  if (DRY_RUN) {
    console.log("\n[embed-laws] --dry-run: skipping OpenAI embedding + Supabase upsert.");
    return;
  }

  // ---- LIVE RUN below: OpenAI + Supabase calls only happen past this point. ----
  const { embedTexts } = await import("../src/lib/embeddings/openai.ts");
  const { getSupabaseAdmin } = await import("../src/lib/supabase/admin.ts");

  console.log(`\n[embed-laws] Embedding ${allRows.length} chunks via OpenAI (text-embedding-3-small)...`);
  const embeddings = await embedTexts(allRows.map(buildEmbedInput));

  const supabase = getSupabaseAdmin();
  let upserted = 0;
  for (let i = 0; i < allRows.length; i += UPSERT_BATCH_SIZE) {
    const rowBatch = allRows.slice(i, i + UPSERT_BATCH_SIZE).map((row, j) => ({
      ...row,
      embedding: embeddings[i + j],
    }));
    const { error } = await supabase
      .from("law_chunks")
      .upsert(rowBatch, { onConflict: "law_name,section_number" });
    if (error) {
      throw new Error(`[embed-laws] Supabase upsert failed at batch starting index ${i}: ${error.message}`);
    }
    upserted += rowBatch.length;
    console.log(`[embed-laws] upserted ${upserted}/${allRows.length}`);
  }

  console.log(
    `\n[embed-laws] Done. Upserted ${upserted} rows into law_chunks (idempotent on rerun via (law_name, section_number)).`
  );
}

main().catch((err) => {
  console.error("[embed-laws] FAILED:", err);
  process.exitCode = 1;
});
