/**
 * Server-side PDF text extraction via unpdf (a serverless-friendly pdfjs build). Text layer
 * only, no OCR.
 *
 * Word-spacing reconstruction: unpdf's high-level extractText joins glyph runs without inserting
 * spaces. Many Hebrew PDFs position each word as a separate run with no explicit space character,
 * so that path produces run-together text ("הואילוהמשכיר"). We instead read the positioned runs via
 * getTextContent and insert a space wherever the horizontal gap between two runs on a line exceeds a
 * fraction of the font size — recovering readable word boundaries. PDFs that already carry proper
 * spaces are unaffected (their runs sit flush, so no extra spaces are added).
 *
 * Scanned-PDF guard: an image-only (scanned) PDF has no text layer, so extraction returns
 * ~nothing. We flag it when a non-trivially-sized file yields almost no text, and the caller
 * surfaces a clear Hebrew error. OCR is deferred (see TODO.md [P3+]).
 */
import { getDocumentProxy } from "unpdf";

/** Below this many extracted chars, for a file larger than SCANNED_MIN_BYTES, we treat it as scanned. */
const SCANNED_MIN_TEXT_CHARS = 100;
const SCANNED_MIN_BYTES = 100 * 1024; // 100KB

// Insert a space when the horizontal gap between two glyph runs exceeds this fraction of the font size.
const SPACE_GAP_FACTOR = 0.2;

export interface ExtractResult {
  text: string;
  pages: number;
}

interface GlyphRun {
  str: string;
  transform: number[];
  width: number;
  hasEOL: boolean;
}

/** Join positioned glyph runs into text, restoring word spaces from horizontal gaps (RTL-aware). */
function reconstructText(items: unknown[]): string {
  let out = "";
  let prev: GlyphRun | null = null;

  for (const raw of items) {
    const run = raw as Partial<GlyphRun>;
    if (typeof run.str !== "string" || !Array.isArray(run.transform)) {
      continue; // marked-content boundary or non-text item
    }
    if (run.str === "") {
      if (run.hasEOL) {
        out = out.replace(/ +$/, "") + "\n";
        prev = null;
      }
      continue;
    }
    const item = run as GlyphRun;
    if (prev) {
      // RTL: the previous run sits to the RIGHT, so gap = its left edge (transform[4]) minus this
      // run's right edge (transform[4] + width).
      const gap = prev.transform[4] - (item.transform[4] + item.width);
      const fontSize = Math.abs(item.transform[0]) || 10;
      if (gap > fontSize * SPACE_GAP_FACTOR && !out.endsWith(" ") && !out.endsWith("\n")) {
        out += " ";
      }
    }
    out += item.str;
    if (item.hasEOL) {
      out = out.replace(/ +$/, "") + "\n";
      prev = null;
    } else {
      prev = item;
    }
  }
  return out;
}

export async function extractPdfText(data: Uint8Array): Promise<ExtractResult> {
  // getDocumentProxy takes ownership of the buffer; pass a copy so callers can reuse `data`
  // (e.g. for the scanned-size check on the original bytes).
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const pageCount = pdf.numPages;

  const pageTexts: string[] = [];
  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const { items } = await page.getTextContent();
    pageTexts.push(reconstructText(items));
  }

  const text = pageTexts
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, pages: pageCount };
}

/**
 * True when the PDF looks like a scan (image-only): a meaningfully-sized file that yielded
 * almost no extractable text.
 */
export function isLikelyScanned(text: string, byteSize: number): boolean {
  return text.trim().length < SCANNED_MIN_TEXT_CHARS && byteSize > SCANNED_MIN_BYTES;
}

export const SCANNED_ERROR_MESSAGE =
  "החוזה שהעלית נראה סרוק (PDF תמונה). המערכת תומכת כרגע רק ב-PDF טקסטואלי. " +
  "נסה לשמור את הקובץ מהמקור בפורמט טקסט, או פנה לתמיכה.";
