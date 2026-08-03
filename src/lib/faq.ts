/**
 * Canonical FAQ content — one source for the home-page FAQ section, the dedicated /faq page, and
 * the FAQPage JSON-LD (AEO). Answers are grounded in what the product actually does.
 */
export const PRICE_ILS = 49;

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ: FaqItem[] = [
  {
    q: "האם התיקונים שהמערכת מציעה תקפים משפטית?",
    a: "הכלי הוא כלי עזר, לא תחליף לעורך דין. התיקונים מתבססים על חוק השכירות והשאילה תשל\"א-1971, חוק שכירות הוגנת תשע\"ז-2017, ופסיקה עדכנית. מומלץ להתייעץ עם עורך דין לפני חתימה על סכומים גדולים.",
  },
  {
    q: "מה קורה עם החוזה שלי אחרי הסריקה?",
    a: "הוא מוצפן ונשמר בסופאבייס. אחרי 30 יום נמחק אוטומטית. לא משתמשים בו לאימון AI. רק אתה רואה את הדו\"ח שלך.",
  },
  {
    q: "מה אם המערכת פספסה סעיף חשוב?",
    a: "יש כפתור \"השופט טעה או פספס משהו?\" בכל דו\"ח. הדיווח שלך עוזר לשפר את המערכת. חשוב שתדע: המערכת היא כלי עזר, לא הוכחה בבית משפט.",
  },
  {
    q: "האם אני יכול להוריד את הדו\"ח כ-PDF ולתת לעורך הדין שלי?",
    a: "כן. יש כפתור להורדת החוזה המתוקן כ-PDF בסוף כל דו\"ח — כולל המקור, התיקון המוצע, וההפניה לחוק.",
  },
  {
    q: "המערכת עובדת על חוזי משנה (סאבלט) או חוזים מסחריים?",
    a: "כרגע — רק חוזי שכירות למגורים בישראל. חוזים מסחריים וחוזי משנה יגיעו בעתיד.",
  },
  {
    q: "כמה זה עולה?",
    a: `סריקה ראשונה חינם. אחר כך ${PRICE_ILS} ₪ לסריקה. אין מנוי, אין הפתעות.`,
  },
  {
    q: "האם הפרטים שלי משותפים עם צד שלישי?",
    a: "לא. שום פרט לא נמכר, לא משותף, ולא מועבר. רק Claude API מקבל את טקסט החוזה לצורך הניתוח — ואינו שומר אותו.",
  },
];

/** FAQPage structured data (schema.org) built from the same content. */
export const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};
