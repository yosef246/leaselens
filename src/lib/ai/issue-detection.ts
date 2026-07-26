/**
 * Per-clause problem detection for the /review feature.
 *
 * Each contract section is sent to Claude with a small set of law sections we retrieved for it,
 * numbered [1], [2]…. The model classifies the clause and, crucially, may only ground it in one
 * of THOSE numbered law sources (it returns `law_marker`, an index) — WE resolve the human
 * reference from the marker. This is the same anti-hallucination pattern as the RAG chat
 * (lib/rag/prompt.ts): the model can't invent a section number or law name it wasn't handed.
 */
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";

const MODEL = "claude-sonnet-5";

export const ISSUE_CATEGORIES = [
  "ok",
  "ambiguous",
  "one-sided",
  "missing-standard",
  "illegal",
  "trap",
] as const;
export type AnalyzedCategory = (typeof ISSUE_CATEGORIES)[number];

/** Structured output Claude is constrained to per section. */
const sectionSchema = z.object({
  category: z.enum(ISSUE_CATEGORIES),
  severity: z.number().int().min(1).max(5),
  explanation: z.string(),
  suggested_fix: z.string(),
  law_marker: z
    .number()
    .int()
    .nullable()
    .describe("index of the grounding law source from the provided list, or null"),
});

export interface LawCandidate {
  marker: number; // 1-based
  label: string; // "חוק השכירות והשאילה §25י"
  text: string;
}

export interface SectionAnalysis {
  category: AnalyzedCategory;
  severity: number;
  explanation: string;
  suggested_fix: string;
  law_reference: string | null;
}

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

function buildSectionPrompt(
  sectionNumber: string | null,
  text: string,
  lawCandidates: LawCandidate[]
): string {
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

/** Analyze a single contract section. Resolves law_reference from the marker the model chose. */
export async function analyzeSection(
  sectionNumber: string | null,
  text: string,
  lawCandidates: LawCandidate[]
): Promise<SectionAnalysis> {
  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: sectionSchema,
    system: SYSTEM,
    prompt: buildSectionPrompt(sectionNumber, text, lawCandidates),
    // claude-sonnet-5 ignores temperature (AI SDK warns) — omitted deliberately.
  });

  const law_reference =
    object.law_marker != null
      ? lawCandidates.find((c) => c.marker === object.law_marker)?.label ?? null
      : null;

  return {
    category: object.category,
    severity: object.severity,
    explanation: object.explanation.trim(),
    suggested_fix: object.suggested_fix.trim(),
    law_reference,
  };
}
