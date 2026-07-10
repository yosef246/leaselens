/**
 * Generates fixtures/sample-rental-contract.pdf — a synthetic Hebrew residential-lease
 * contract (~13 numbered sections) used as the dev fixture for the parse→chunk→embed pipeline
 * (pnpm process:sample). One drawText per line so the PDF text layer extracts in logical order.
 *
 * Dev-only. Embeds a subset of a system Hebrew-capable font (Arial/David). Regenerate with:
 *   pnpm make-fixture
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const FONT_CANDIDATES = [
  "C:/Windows/Fonts/arial.ttf",
  "C:/Windows/Fonts/David.ttf",
  "C:/Windows/Fonts/tahoma.ttf",
];

const OUT_DIR = "fixtures";
const OUT_PATH = `${OUT_DIR}/sample-rental-contract.pdf`;

const LINES: string[] = [
  "חוזה שכירות למגורים",
  "",
  'בין המשכיר יוסף כהן (להלן: "המשכיר") לבין השוכר דוד לוי (להלן: "השוכר").',
  "",
  "1. המשכיר מוסר לשוכר את הדירה ברחוב הרצל 10, תל אביב, למגורים בלבד.",
  "2. תקופת השכירות היא 12 חודשים, מיום 01.08.2026 ועד 31.07.2027.",
  '3. דמי השכירות החודשיים הם 5,000 ש"ח, שישולמו ביום ה-1 לכל חודש.',
  '4. השוכר יפקיד בידי המשכיר ערובה בסך 10,000 ש"ח להבטחת התחייבויותיו.',
  "5. הערובה תוחזר לשוכר בתוך 60 יום מתום השכירות, בניכוי חובות אם קיימים.",
  "6. השוכר מתחייב לשמור על הדירה ולהחזירה במצב תקין, למעט בלאי סביר.",
  "7. השוכר לא יעביר את זכויותיו לצד שלישי ללא הסכמת המשכיר בכתב ומראש.",
  "8. תיקונים הנובעים משימוש סביר יחולו על המשכיר; נזק שנגרם בזדון על השוכר.",
  "9. המשכיר רשאי לבטל את החוזה אם השוכר לא שילם דמי שכירות במשך 30 יום.",
  "10. השוכר רשאי לסיים את החוזה בהתראה של 60 יום מראש ובכתב.",
  '11. במקרה של הפרה יסודית, הצד הנפגע זכאי לפיצוי מוסכם בסך 5,000 ש"ח.',
  "12. על חוזה זה יחול הדין הישראלי, וסמכות השיפוט נתונה לבתי המשפט בתל אביב.",
  "13. הצדדים מצהירים כי קראו והבינו את תנאי החוזה וחתמו עליו מרצונם החופשי.",
];

/**
 * pdf-parse applies BiDi reordering on extraction, which flips multi-digit number runs in an
 * RTL line ("10" → "01"). Since we draw in logical order, we pre-reverse each digit run here so
 * the EXTRACTED text reads correctly. (Fixture-only cosmetic; real RTL PDFs carry proper BiDi.)
 */
const reverseDigitsOnly = (s: string) => s.replace(/\d+/g, (r) => [...r].reverse().join(""));
const reverseNumberRuns = (s: string) =>
  s.replace(/[0-9][0-9.,:/-]*/g, (r) => [...r].reverse().join(""));

function preReverseNumberRuns(line: string): string {
  // pdf-parse's BiDi reverses number runs on extraction. Counter it so extracted text reads right:
  //  - leading section marker ("12. "): reverse ONLY its digits (keep the ".") — pdf-parse flips
  //    just the digits back to "12." so the chunker's ^number regex still matches.
  //  - in-body numbers ("5,000", "01.08.2026"): reverse the whole run incl. separators, since
  //    pdf-parse reverses those as a unit.
  const marker = line.match(/^(\s*\d+[א-ת]?\.?\s+)/);
  if (marker) {
    return reverseDigitsOnly(marker[1]) + reverseNumberRuns(line.slice(marker[1].length));
  }
  return reverseNumberRuns(line);
}

function findFont(): string {
  for (const p of FONT_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `No Hebrew-capable font found. Tried: ${FONT_CANDIDATES.join(", ")}. ` +
      "Point FONT_CANDIDATES at a .ttf that includes Hebrew glyphs."
  );
}

async function main(): Promise<void> {
  const fontPath = findFont();
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(readFileSync(fontPath), { subset: true });

  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN = 48;
  const SIZE = 12;
  const LINE_H = 26;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  for (const line of LINES) {
    if (y < MARGIN) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    if (line.length > 0) {
      page.drawText(preReverseNumberRuns(line), {
        x: MARGIN,
        y,
        size: SIZE,
        font,
        color: rgb(0, 0, 0),
      });
    }
    y -= LINE_H;
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const bytes = await pdfDoc.save();
  writeFileSync(OUT_PATH, bytes);
  console.log(`[make-fixture] wrote ${OUT_PATH} (${bytes.length} bytes, font: ${fontPath})`);
}

main().catch((err) => {
  console.error("[make-fixture] FAILED:", err);
  process.exitCode = 1;
});
