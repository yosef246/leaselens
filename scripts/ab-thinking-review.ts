/**
 * Review issue-detection harness — measure the effect of `thinking` on quality + latency.
 *
 * Mirrors the EXACT production classification (system prompt, schema, buildSectionPrompt, law
 * retrieval, MAX_SECTIONS, CONCURRENCY — from src/lib/ai/issue-detection.ts + the review route)
 * over the sample contract, changing ONLY the thinking config. Both A/B arms share one retrieval
 * pass, so law candidates are identical. Caching is intentionally NOT applied (clean latency).
 *
 *   pnpm ab:thinking                 → A/B: thinking ON (adaptive) vs OFF (disabled) — full compare
 *   THINKING_MODE=off pnpm ab:thinking   → single run, thinking disabled (current prod setting)
 *   THINKING_MODE=low pnpm ab:thinking   → single run, adaptive thinking + effort:low
 *   THINKING_MODE=on  pnpm ab:thinking   → single run, adaptive thinking (sonnet-5 default)
 *
 * Needs ANTHROPIC_API_KEY, OPENAI_API_KEY, Supabase env, and law_chunks populated. Costs real tokens.
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { loadLocalEnv } from "../src/lib/load-local-env.ts";
import { extractPdfText } from "../src/lib/pdf/extract.ts";
import { chunkContract } from "../src/lib/chunking/contract-chunker.ts";
import { embedTexts } from "../src/lib/embeddings/openai.ts";
import { buildKeywordQuery } from "../src/lib/rag/query.ts";
import { getSupabaseAdmin } from "../src/lib/supabase/admin.ts";

loadLocalEnv();

const FIXTURE = "fixtures/sample-rental-contract.pdf";
const MODEL = "claude-sonnet-5";
const MAX_SECTIONS = 30; // matches review route
const CONCURRENCY = 6; // matches review route
const LAW_K = 4; // matches review route

type ThinkMode = "off" | "low" | "on";
const MODE_LABEL: Record<ThinkMode, string> = {
  off: "thinking OFF (disabled)",
  low: "thinking adaptive + effort:low",
  on: "thinking ON (adaptive)",
};

/** Provider options per mode — the ONLY thing that varies between runs. */
function providerOptsFor(mode: ThinkMode) {
  switch (mode) {
    case "off":
      return { anthropic: { thinking: { type: "disabled" as const } } };
    case "low":
      return { anthropic: { thinking: { type: "adaptive" as const }, effort: "low" as const } };
    case "on":
      return { anthropic: { thinking: { type: "adaptive" as const } } };
  }
}

const ENV_MODE = process.env.THINKING_MODE as ThinkMode | undefined;
const SINGLE: ThinkMode | null =
  ENV_MODE && ["off", "low", "on"].includes(ENV_MODE) ? ENV_MODE : null;

// ── Mirrors of src/lib/ai/issue-detection.ts (kept verbatim so the harness tests the real path) ──
const ISSUE_CATEGORIES = ["ok", "ambiguous", "one-sided", "missing-standard", "illegal", "trap"] as const;

const sectionSchema = z.object({
  category: z.enum(ISSUE_CATEGORIES),
  severity: z.number().int().min(1).max(5),
  explanation: z.string(),
  suggested_fix: z.string(),
  law_marker: z.number().int().nullable(),
});

const SYSTEM = `אתה מומחה לחוזי שכירות בישראל. עליך לסווג סעיף בודד מתוך חוזה שכירות למגורים לאחת מהקטגוריות הבאות בלבד:
- ok: הסעיף תקין וסביר, ללא בעיה.
- ambiguous: ניסוח עמום שניתן לפרש ביותר מדרך אחת (למשל "הודעה מראש בכתב" בלי להגדיר מהו "בכתב").
- one-sided: חד-צדדי באופן לא הוגן לטובת בעל הדירה.
- missing-standard: חסר בו דבר שהחוק מחייב לכלול או להסדיר.
- illegal: סותר את הדין הישראלי (חוק השכירות והשאילה וחקיקה רלוונטית).
- trap: "אותיות קטנות" שמאפשרות פרשנות חד-צדדית או מטילות חבות מפתיעה על השוכר.

לכל סעיף החזר אובייקט: category, severity (1-5, כאשר 5 = חמור מאוד), explanation בעברית פשוטה וברורה, suggested_fix (הצעת ניסוח משופר וֹהוגן; מחרוזת ריקה אם category=ok), ו-law_marker — מספר מקור החוק הרלוונטי מתוך רשימת המקורות שסופקה, או null אם אף מקור אינו רלוונטי.

כללי ברזל:
1. ענה בעברית בלבד.
2. הסתמך אך ורק על מקורות החוק הממוספרים שסופקו. אין להמציא מספרי סעיף או שמות חוק. אם אף מקור אינו רלוונטי, החזר law_marker=null.
3. אם הסעיף תקין — category="ok", severity=1, suggested_fix="".
4. אל תסמן סעיף כבעייתי ללא נימוק ענייני. במקרה של ספק אמיתי, העדף "ambiguous" על פני "illegal".`;

interface LawCandidate {
  marker: number;
  label: string;
  text: string;
}

function buildSectionPrompt(sectionNumber: string | null, text: string, lawCandidates: LawCandidate[]): string {
  const header = sectionNumber ? `סעיף ${sectionNumber} מהחוזה` : "קטע מהחוזה";
  const lawBlock =
    lawCandidates.length > 0
      ? lawCandidates.map((c) => `[${c.marker}] ${c.label}: ${c.text}`).join("\n\n")
      : "(לא נמצאו מקורות חוק רלוונטיים)";
  return `${header}:
"""
${text}
"""

מקורות חוק אפשריים (השתמש רק בהם עבור law_marker):
${lawBlock}

סווג את הסעיף הזה בלבד.`;
}

interface Analysis {
  category: string;
  severity: number;
  explanation: string;
  suggested_fix: string;
  law_reference: string | null;
}

/** Bounded-concurrency map preserving order (mirrors the review route). */
async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function main() {
  const { createAnthropic } = await import("@ai-sdk/anthropic");
  const { generateObject } = await import("ai");
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const supabase = getSupabaseAdmin();

  // 1. Extract + chunk the sample contract.
  const bytes = new Uint8Array(readFileSync(FIXTURE));
  const { text } = await extractPdfText(bytes);
  const allChunks = chunkContract(text);
  const chunks = allChunks.slice(0, MAX_SECTIONS);
  console.log(`Contract: ${allChunks.length} chunks (analyzing first ${chunks.length}).\n`);

  // 2. Embed + retrieve law candidates ONCE (shared by every arm).
  const embeddings = await embedTexts(chunks.map((c) => c.text));
  const lawByChunk: LawCandidate[][] = await mapPool(chunks, CONCURRENCY, async (chunk, i) => {
    const { data, error } = await supabase.rpc("match_law_chunks_hybrid", {
      p_query_embedding: embeddings[i],
      p_query_text: buildKeywordQuery(chunk.text),
      p_match_count: LAW_K,
    });
    if (error) throw new Error(`law retrieval failed: ${error.message}`);
    return (data ?? []).map((h: { short_title: string; section_number: string; text: string }, idx: number) => ({
      marker: idx + 1,
      label: `${h.short_title} §${h.section_number}`,
      text: h.text,
    }));
  });

  async function analyze(chunk: (typeof chunks)[number], law: LawCandidate[], mode: ThinkMode): Promise<Analysis> {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: sectionSchema,
      system: SYSTEM,
      prompt: buildSectionPrompt(chunk.section_number, chunk.text, law),
      providerOptions: providerOptsFor(mode),
    });
    const law_reference =
      object.law_marker != null ? law.find((c) => c.marker === object.law_marker)?.label ?? null : null;
    return {
      category: object.category,
      severity: object.severity,
      explanation: object.explanation.trim(),
      suggested_fix: object.suggested_fix.trim(),
      law_reference,
    };
  }

  const loc = (i: number) =>
    `#${chunks[i].chunk_index}${chunks[i].section_number ? ` (סעיף ${chunks[i].section_number})` : ""}`;
  const flagged = (arr: Analysis[]) => arr.map((a, i) => ({ a, i })).filter(({ a }) => a.category !== "ok");

  async function runArm(mode: ThinkMode): Promise<{ arm: Analysis[]; ms: number }> {
    console.log(`Running: ${MODE_LABEL[mode]}…`);
    const t = Date.now();
    const arm = await mapPool(chunks, CONCURRENCY, (c, i) => analyze(c, lawByChunk[i], mode));
    return { arm, ms: Date.now() - t };
  }

  // ── Single-mode run (THINKING_MODE=off|low|on) ──
  if (SINGLE) {
    const { arm, ms } = await runArm(SINGLE);
    console.log(`\n══════════ ${MODE_LABEL[SINGLE]} ══════════`);
    console.log("loc".padEnd(16) + " │ category      │ sev │ law_reference");
    console.log("─".repeat(16) + "─┼───────────────┼─────┼──────────────");
    for (let i = 0; i < chunks.length; i++) {
      const a = arm[i];
      console.log(`${loc(i).padEnd(16)} │ ${a.category.padEnd(13)} │  ${a.severity}  │ ${a.law_reference ?? "—"}`);
    }
    console.log(`\ndetected (non-ok): ${flagged(arm).map(({ i }) => loc(i)).join(", ") || "—"}`);
    console.log(`runtime:           ${(ms / 1000).toFixed(1)}s`);
    return;
  }

  // ── Default A/B: thinking ON vs OFF ──
  const { arm: armA, ms: msA } = await runArm("on");
  const { arm: armB, ms: msB } = await runArm("off");

  console.log("\n══════════ FULL COMPARISON (all sections) ══════════");
  console.log("loc".padEnd(16) + " │ A(on):cat    sev │ B(off):cat   sev │ Δ");
  console.log("─".repeat(16) + "─┼──────────────────┼──────────────────┼───");
  let catDiffs = 0;
  let sevDiffs = 0;
  for (let i = 0; i < chunks.length; i++) {
    const a = armA[i];
    const b = armB[i];
    const catDiff = a.category !== b.category;
    const sevDiff = a.severity !== b.severity;
    if (catDiff) catDiffs++;
    if (sevDiff) sevDiffs++;
    const flag = catDiff ? "CAT" : sevDiff ? "sev" : "";
    console.log(
      loc(i).padEnd(16) +
        ` │ ${a.category.padEnd(12)} ${a.severity}  │ ${b.category.padEnd(12)} ${b.severity}  │ ${flag}`
    );
  }

  console.log("\n══════════ DETECTED (category !== ok) ══════════");
  console.log(`arm A (ON):  ${flagged(armA).map(({ i }) => loc(i)).join(", ") || "—"}`);
  console.log(`arm B (OFF): ${flagged(armB).map(({ i }) => loc(i)).join(", ") || "—"}`);

  console.log("\n══════════ CATEGORY DIFFS ══════════");
  const catDiffRows = armA.map((a, i) => ({ a, b: armB[i], i })).filter(({ a, b }) => a.category !== b.category);
  if (catDiffRows.length === 0) console.log("(none — categories identical across all sections)");
  for (const { a, b, i } of catDiffRows)
    console.log(`${loc(i)}: A="${a.category}" (sev ${a.severity})  →  B="${b.category}" (sev ${b.severity})`);

  console.log("\n══════════ SEVERITY DIFFS (same category) ══════════");
  const sevDiffRows = armA
    .map((a, i) => ({ a, b: armB[i], i }))
    .filter(({ a, b }) => a.category === b.category && a.severity !== b.severity);
  if (sevDiffRows.length === 0) console.log("(none)");
  for (const { a, b, i } of sevDiffRows) console.log(`${loc(i)}: ${a.category}  sev ${a.severity} (A) vs ${b.severity} (B)`);

  console.log("\n══════════ EXPLANATION SAMPLES (up to 5 flagged sections) ══════════");
  const sampleIdx = flagged(armA)
    .map(({ i }) => i)
    .concat(flagged(armB).map(({ i }) => i))
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .slice(0, 5);
  for (const i of sampleIdx) {
    console.log(`\n── ${loc(i)} ──`);
    console.log(`  A (ON):   [${armA[i].category}/${armA[i].severity}] ${armA[i].explanation}`);
    console.log(`  B (OFF):  [${armB[i].category}/${armB[i].severity}] ${armB[i].explanation}`);
  }

  console.log("\n══════════ SUMMARY ══════════");
  console.log(`sections analyzed:     ${chunks.length}`);
  console.log(`detected (A / B):      ${flagged(armA).length} / ${flagged(armB).length}`);
  console.log(`category diffs:        ${catDiffs}`);
  console.log(`severity diffs:        ${sevDiffs}`);
  console.log(`runtime A (ON):        ${(msA / 1000).toFixed(1)}s`);
  console.log(`runtime B (OFF):       ${(msB / 1000).toFixed(1)}s`);
  console.log(`speedup (A→B):         ${(msA / msB).toFixed(2)}x faster`);
  console.log("\nNote: no ground truth — diffs show divergence + speed, not accuracy. A single A/B");
  console.log("also conflates thinking-effect with run-to-run noise; average multiple runs to separate them.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
