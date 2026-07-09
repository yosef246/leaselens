/**
 * Server-side PDF text extraction (pdf-parse v2 → pdfjs). Text layer only, no OCR.
 *
 * Scanned-PDF guard: an image-only (scanned) PDF has no text layer, so pdf-parse returns
 * ~nothing. We flag it when a non-trivially-sized file yields almost no text, and the caller
 * surfaces a clear Hebrew error. OCR is deferred (see TODO.md [P3+]).
 */
import { PDFParse } from "pdf-parse";

/** Below this many extracted chars, for a file larger than SCANNED_MIN_BYTES, we treat it as scanned. */
const SCANNED_MIN_TEXT_CHARS = 100;
const SCANNED_MIN_BYTES = 100 * 1024; // 100KB

export interface ExtractResult {
  text: string;
  pages: number;
}

export async function extractPdfText(data: Uint8Array): Promise<ExtractResult> {
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return { text: result.text ?? "", pages: result.total ?? 0 };
  } finally {
    await parser.destroy();
  }
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
