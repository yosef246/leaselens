/**
 * Canned data for the no-auth /demo page — a real answer the live pipeline produced for
 * "האם סעיף הפיקדון חוקי?" on the sample contract, so visitors see the product without signing in.
 */
import type { RagSource } from "@/lib/rag/prompt";

export const DEMO_ANSWER = `**גובה הערובה**
החוזה קובע ערובה בסך 10,000 ₪ [א]. החוק מגביל את גובה הערובה לנמוך מבין שליש מסך דמי השכירות לכל התקופה, או שווי של שלושה חודשי שכירות [1].

כדי לקבוע אם 10,000 ₪ חוקיים יש להשוות אותם לתקרה — לכן חשוב לבדוק מול דמי השכירות החודשיים בחוזה שלך [1].

**מועד ותנאי החזרת הערובה**
החוזה קובע החזרה תוך 60 יום מתום השכירות [ב], בעוד החוק מונה את 60 הימים ממועד השבת הדירה בפועל, ומגביל את הניכויים למקרים ספציפיים בלבד [1]. הניסוח הכללי בחוזה ("בניכוי חובות אם קיימים") רחב מהמותר בחוק.`;

export const DEMO_SOURCES: RagSource[] = [
  {
    marker: "1",
    type: "law",
    label: "חוק השכירות והשאילה §25י",
    section_number: "25י",
    snippet:
      "לא יידרש שוכר בערובה בסכום העולה על הנמוך מבין שליש מדמי השכירות לכל תקופת השכירות או דמי שכירות של שלושה חודשים…",
    similarity: 0.206,
    keyword_matched: true,
  },
  {
    marker: "א",
    type: "contract",
    label: "סעיף 4 בחוזה",
    section_number: "4",
    snippet: "השוכר יפקיד בידי המשכיר ערובה בסך 10,000 ש\"ח להבטחת התחייבויותיו.",
    similarity: 0.266,
  },
  {
    marker: "ב",
    type: "contract",
    label: "סעיף 5 בחוזה",
    section_number: "5",
    snippet: "הערובה תוחזר לשוכר בתוך 60 יום מתום השכירות, בניכוי חובות אם קיימים.",
    similarity: 0.117,
  },
];

export const DEMO_CONTRACT_CLAUSES: { n: string; text: string }[] = [
  { n: "3", text: "דמי השכירות החודשיים הם 5,000 ש\"ח, שישולמו ביום ה-1 לכל חודש." },
  { n: "4", text: "השוכר יפקיד בידי המשכיר ערובה בסך 10,000 ש\"ח להבטחת התחייבויותיו." },
  { n: "5", text: "הערובה תוחזר לשוכר בתוך 60 יום מתום השכירות, בניכוי חובות אם קיימים." },
];
