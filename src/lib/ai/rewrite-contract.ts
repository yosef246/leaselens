/**
 * Contract rewriter: given the original contract sections + the fixes the user approved on the
 * /review screen, produce a corrected contract that keeps the original structure and numbering and
 * replaces only the flagged clauses.
 *
 * Output-volume design: Claude rewrites ONLY the sections that have an approved fix (each keyed by a
 * `ref` = its index in the originals). The FULL document is then reassembled here on the server —
 * unchanged sections keep their original text verbatim, fixed sections get Claude's polished prose.
 * This keeps the model's output small (a handful of sections, not the whole contract), so a single
 * call stays well within the serverless duration budget even with thinking on. Reassembling
 * server-side is also more faithful than asking the model to copy unchanged clauses.
 */
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { cachedSystem, CLAUDE_MODEL } from "@/lib/ai/claude";
import { extractUsage, type ClaudeUsage } from "@/lib/ai/usage";

const MODEL = CLAUDE_MODEL;

/** Claude returns only the rewritten fixed sections, keyed by ref. */
const llmSchema = z.object({
  sections: z.array(
    z.object({
      ref: z.number().int(),
      text: z.string(),
    })
  ),
});

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
  category: string;
  suggested_fix: string;
}

const EMPTY_USAGE: ClaudeUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
};

const SYSTEM = `אתה עורך דין מומחה לחוזי שכירות בישראל. תקבל סעיפים בודדים מתוך חוזה שכירות, כל אחד עם מזהה ref, הנוסח המקורי, ותיקון מאושר שיש להחיל.

כללי ברזל:
1. שכתב כל סעיף כך שישקף את התיקון המאושר, תוך שמירה על ההקשר והמשמעות של הסעיף.
2. שמור על סגנון פורמלי-משפטי, בעברית בלבד.
3. אל תוסיף הערות, הסברים, כותרות או טקסט מטא — רק לשון הסעיף עצמו.
4. אל תשנה את מספור הסעיפים.
5. החזר sections: מערך של {ref, text}, כאשר ref זהה למזהה שסופק וה-text הוא הנוסח המתוקן. החזר אך ורק את הסעיפים שסופקו לך.`;

interface RewriteTask {
  ref: number;
  section_number: string | null;
  original: string;
  fix: ApprovedFix;
}

function buildPrompt(tasks: RewriteTask[]): string {
  const blocks = tasks.map((t) => {
    const header = t.section_number ? `סעיף ${t.section_number}` : "קטע";
    return `--- ref ${t.ref} | ${header} ---\nמקור: ${t.original}\nתיקון מאושר (${t.fix.category}): ${t.fix.suggested_fix}`;
  });
  return `שכתב את הסעיפים הבאים בלבד. לכל סעיף החזר {ref, text} עם הנוסח המתוקן.

${blocks.join("\n\n")}`;
}

export async function rewriteContract(
  title: string,
  originals: OriginalSection[],
  approved: ApprovedFix[]
): Promise<{ document: RewriteResult; usage: ClaudeUsage }> {
  // Map each approved fix to its section_number (first wins on duplicate keys).
  const fixByKey = new Map<string, ApprovedFix>();
  for (const f of approved) {
    const key = f.section_number ?? "";
    if (!fixByKey.has(key)) fixByKey.set(key, f);
  }

  // Only the originals that have an approved fix are sent to the model.
  const tasks: RewriteTask[] = [];
  originals.forEach((o, i) => {
    const fix = fixByKey.get(o.section_number ?? "");
    if (fix) tasks.push({ ref: i, section_number: o.section_number, original: o.text, fix });
  });

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

  const { object, usage, providerMetadata } = await generateObject({
    model: anthropic(MODEL),
    schema: llmSchema,
    system: cachedSystem(SYSTEM), // prompt-cache the stable rewrite system prompt
    prompt: buildPrompt(tasks),
    // Thinking stays ON (sonnet-5's default): output is now just the fixed sections (a handful),
    // so a single call fits the 60s budget with room to spare, and the legal rephrasing keeps its
    // reasoning quality.
  });

  const validRefs = new Set(tasks.map((t) => t.ref));
  const rewritten = new Map<number, string>();
  for (const s of object.sections) {
    if (validRefs.has(s.ref) && s.text.trim()) rewritten.set(s.ref, s.text.trim());
  }

  return { document: assemble(rewritten), usage: extractUsage(usage, providerMetadata) };
}
