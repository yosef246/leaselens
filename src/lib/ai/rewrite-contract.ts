/**
 * Contract rewriter: given the original contract sections + the fixes the user approved on the
 * /review screen, produce a corrected contract that keeps the original structure and numbering and
 * replaces only the flagged clauses.
 *
 * Output is structured (generateObject) so the PDF renderer gets clean sections rather than having
 * to parse free text — same anti-drift approach as issue-detection.
 */
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { cachedSystem } from "@/lib/ai/claude";
import { extractUsage, type ClaudeUsage } from "@/lib/ai/usage";

const MODEL = "claude-sonnet-5";

const rewriteSchema = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      number: z.string().nullable(),
      text: z.string(),
    })
  ),
});

export type RewriteResult = z.infer<typeof rewriteSchema>;

export interface OriginalSection {
  section_number: string | null;
  text: string;
}
export interface ApprovedFix {
  section_number: string | null;
  category: string;
  suggested_fix: string;
}

const SYSTEM = `אתה עורך דין מומחה לחוזי שכירות בישראל. משימתך: לשכתב חוזה שכירות קיים כך שיתוקנו הסעיפים הבעייתיים שסומנו.

כללי ברזל:
1. שמור על המבנה והמספור המקוריים של החוזה. אל תוסיף, תמחק או תמספר מחדש סעיפים.
2. החלף אך ורק את הסעיפים שסופקה עבורם הצעת תיקון מאושרת. סעיפים שלא סומנו — העתק כלשונם, ללא שינוי.
3. שמור על סגנון פורמלי-משפטי אחיד לאורך כל החוזה.
4. אל תוסיף הערות, הסברים, הדגשות או טקסט מטא בגוף החוזה — רק לשון החוזה עצמו.
5. ענה בעברית בלבד.
6. החזר title (כותרת החוזה) ו-sections: מערך של {number, text}, בסדר המקורי.`;

function buildPrompt(
  title: string,
  originals: OriginalSection[],
  approved: ApprovedFix[]
): string {
  const fixByKey = new Map<string, ApprovedFix>();
  approved.forEach((f) => fixByKey.set(f.section_number ?? "", f));

  const blocks = originals.map((s) => {
    const key = s.section_number ?? "";
    const fix = fixByKey.get(key);
    const header = s.section_number ? `סעיף ${s.section_number}` : "קטע";
    const fixLine = fix
      ? `\nתיקון מאושר להחלה (${fix.category}): ${fix.suggested_fix}`
      : "\n(אין תיקון — העתק כלשונו)";
    return `--- ${header} ---\nמקור: ${s.text}${fixLine}`;
  });

  return `כותרת החוזה: ${title}

להלן סעיפי החוזה המקורי. לכל סעיף שיש לו "תיקון מאושר" — שכתב אותו כך שישקף את התיקון תוך שמירה על סגנון משפטי. סעיפים ללא תיקון — העתק כלשונם.

${blocks.join("\n\n")}

החזר את החוזה המלא המתוקן.`;
}

export async function rewriteContract(
  title: string,
  originals: OriginalSection[],
  approved: ApprovedFix[]
): Promise<{ document: RewriteResult; usage: ClaudeUsage }> {
  const { object, usage, providerMetadata } = await generateObject({
    model: anthropic(MODEL),
    schema: rewriteSchema,
    system: cachedSystem(SYSTEM), // prompt-cache the stable rewrite system prompt
    prompt: buildPrompt(title, originals, approved),
    // Thinking stays ON (sonnet-5's default). This is a single call with the full 60s budget — not
    // the /review fan-out — and it produces a legal document, so reasoning quality is worth the
    // latency here.
  });
  return { document: object, usage: extractUsage(usage, providerMetadata) };
}
