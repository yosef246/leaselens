/**
 * Contract rewriter: given the original contract sections + the fixes the user approved on the
 * /review screen, produce a corrected contract that keeps the original structure and numbering and
 * replaces only the flagged clauses.
 *
 * Output-volume design: Claude rewrites ONLY the sections that have an approved fix. The FULL
 * document is then reassembled here on the server — unchanged sections keep their original text
 * verbatim, fixed sections get Claude's polished prose. Reassembling server-side is more faithful
 * than asking the model to copy unchanged clauses.
 *
 * Latency design: each fixed section is rewritten by its OWN small `generateObject` call, fanned out
 * with bounded concurrency (mirrors the /review path). Wall-clock is therefore bounded by the
 * slowest single-section call (~15-25s), NOT the sum — a single combined call produced 2.6K output
 * tokens and, at ~50s, crept past Vercel's 60s cap when the output ran long (Claude finished and
 * logged usage, but the function was killed before the client got the result). Per-section fan-out
 * gives comfortable headroom.
 */
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { cachedSystem, CLAUDE_MODEL } from "@/lib/ai/claude";
import { extractUsage, sumUsage, type ClaudeUsage } from "@/lib/ai/usage";

const MODEL = CLAUDE_MODEL;

// Each rewrite is one small, independent Claude call. Fan them out so a contract with many approved
// fixes still finishes in ceil(tasks / CONCURRENCY) rounds of ~15-25s rather than one long serial call.
const CONCURRENCY = 8;

/** Claude returns just the rewritten text for the one section it was given. */
const llmSchema = z.object({ text: z.string() });

/** The reassembled full document handed to the PDF renderer. */
export interface RewriteResult {
  title: string;
  sections: { number: string | null; text: string }[];
}

export interface OriginalSection {
  section_number: string | null;
  text: string;
}
export interface ApprovedFix {
  section_number: string | null;
  original_text: string;
  category: string;
  suggested_fix: string;
}

const EMPTY_USAGE: ClaudeUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
};

const SYSTEM = `אתה עורך דין מומחה לחוזי שכירות בישראל. תקבל סעיף בודד מתוך חוזה שכירות — הנוסח המקורי ותיקון מאושר שיש להחיל עליו.

כללי ברזל:
1. שכתב את הסעיף כך שישקף את התיקון המאושר, תוך שמירה על ההקשר והמשמעות של הסעיף.
2. שמור על סגנון פורמלי-משפטי, בעברית בלבד.
3. אל תוסיף הערות, הסברים, כותרות או טקסט מטא — רק לשון הסעיף עצמו.
4. אל תשנה את מספור הסעיף.
5. החזר text: הנוסח המתוקן של הסעיף בלבד.`;

interface RewriteTask {
  ref: number;
  section_number: string | null;
  original: string;
  fix: ApprovedFix;
}

function buildTaskPrompt(task: RewriteTask): string {
  const header = task.section_number ? `סעיף ${task.section_number}` : "קטע";
  return `שכתב את הסעיף הבא בלבד. החזר text עם הנוסח המתוקן.

--- ${header} ---
מקור: ${task.original}
תיקון מאושר (${task.fix.category}): ${task.fix.suggested_fix}`;
}

/** Bounded-concurrency map that preserves input order (same helper shape as the /review route). */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
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

export async function rewriteContract(
  title: string,
  originals: OriginalSection[],
  approved: ApprovedFix[]
): Promise<{ document: RewriteResult; usage: ClaudeUsage }> {
  // Match each approved fix to its exact original clause BY TEXT. section_number is unreliable —
  // most chunks have a null section_number, and keying on `section_number ?? ""` collapses every
  // null-section clause into one bucket, so a single fix over-matches ALL of them (this sent 21
  // sections to the model instead of the ~6 that were actually fixed, blowing past the 60s cap).
  // original_text is the exact chunk text captured at analysis time, so it maps 1:1.
  const tasks: RewriteTask[] = [];
  const usedRefs = new Set<number>();
  for (const fix of approved) {
    const ref = originals.findIndex((o, i) => !usedRefs.has(i) && o.text === fix.original_text);
    if (ref === -1) continue;
    usedRefs.add(ref);
    tasks.push({
      ref,
      section_number: originals[ref].section_number,
      original: originals[ref].text,
      fix,
    });
  }

  const assemble = (rewritten: Map<number, string>): RewriteResult => ({
    title,
    sections: originals.map((o, i) => ({
      number: o.section_number,
      text: rewritten.get(i) ?? o.text,
    })),
  });

  // Defensive: nothing to rewrite (the route requires >=1 approved fix, so this is rare).
  if (tasks.length === 0) {
    return { document: assemble(new Map()), usage: EMPTY_USAGE };
  }

  // One small call per fixed section, fanned out. Disable thinking: sonnet-5's default adaptive
  // thinking roughly doubled per-call latency for no measurable quality gain here — these are
  // already-approved, user-reviewed fixes applied to specific clauses (constrained rephrasing, not
  // open-ended reasoning). Fan-out + no-thinking is what keeps the request comfortably under 60s.
  const outcomes = await mapPool(tasks, CONCURRENCY, async (task) => {
    const { object, usage, providerMetadata } = await generateObject({
      model: anthropic(MODEL),
      schema: llmSchema,
      system: cachedSystem(SYSTEM),
      prompt: buildTaskPrompt(task),
      providerOptions: { anthropic: { thinking: { type: "disabled" } } },
    });
    return {
      ref: task.ref,
      text: object.text.trim(),
      usage: extractUsage(usage, providerMetadata),
    };
  });

  const rewritten = new Map<number, string>();
  for (const o of outcomes) {
    if (o.text) rewritten.set(o.ref, o.text);
  }

  return {
    document: assemble(rewritten),
    usage: sumUsage(outcomes.map((o) => o.usage)),
  };
}
