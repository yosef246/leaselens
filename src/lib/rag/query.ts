/**
 * Query expansion for the keyword arm of hybrid retrieval (migration 0007).
 *
 * Hebrew has no Postgres stemmer, so we normalize at query time:
 *  - strip niqqud + punctuation,
 *  - drop the attached single-letter prefixes (ה/ו/ב/ל/כ/מ/ש) so "הפיקדון" matches "פיקדון",
 *  - drop generic stopwords,
 *  - expand a few legal synonyms (deposit terms are the big one: פיקדון↔ערובה),
 *  - emit an OR-joined prefix-matched tsquery ("פיקדון:* | ערובה:*") for to_tsquery('simple', …).
 */

const NIQQUD = /[֑-ׇ]/g;
const NON_WORD = /[^֐-׿0-9a-zA-Z\s]/g;
const PREFIX_LETTERS = "והבלכמש";

const STOPWORDS = new Set([
  "האם", "את", "של", "על", "עם", "זה", "זו", "מה", "או", "גם", "כי", "אם", "יש",
  "לא", "כל", "אני", "אתה", "הוא", "היא", "הם", "הן", "אנחנו", "אבל", "רק", "עוד",
  "כך", "כדי", "בין", "לפי", "אשר", "כן", "אין", "היה", "להיות", "שלי", "שלו", "שלה",
]);

// Deliberately small + legal. Keyed on the stripped base form.
const SYNONYMS: Record<string, string[]> = {
  פיקדון: ["ערובה", "עירבון"],
  ערובה: ["פיקדון", "עירבון"],
  עירבון: ["ערובה", "פיקדון"],
  בטוחה: ["ערובה", "בטחונות"],
  פינוי: ["סילוק"],
  תיקונים: ["תיקון", "בלאי"],
};

function stripPrefix(word: string): string {
  if (word.length >= 4 && PREFIX_LETTERS.includes(word[0])) return word.slice(1);
  return word;
}

/** Meaningful, expanded base terms (no tsquery syntax). Used by the offline ask:sample matcher. */
export function expandQueryTerms(question: string): string[] {
  const cleaned = question.replace(NIQQUD, "").replace(NON_WORD, " ");
  const terms = new Set<string>();
  for (const rawWord of cleaned.split(/\s+/)) {
    const word = rawWord.trim();
    if (word.length < 2 || STOPWORDS.has(word)) continue;
    const base = stripPrefix(word);
    if (base.length < 2 || STOPWORDS.has(base)) continue;
    terms.add(base);
    for (const syn of SYNONYMS[base] ?? []) terms.add(syn);
  }
  return [...terms];
}

/** Build a to_tsquery('simple', …) string: prefix-matched terms OR-joined. Empty string if none. */
export function buildKeywordQuery(question: string): string {
  return expandQueryTerms(question)
    .map((t) => `${t}:*`)
    .join(" | ");
}
