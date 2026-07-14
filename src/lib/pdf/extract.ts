/**
 * Server-side PDF text extraction via unpdf (a serverless-friendly pdfjs build). Text layer
 * only, no OCR. We use unpdf instead of pdf-parse because pdf-parse's pdfjs path needs browser
 * globals (DOMMatrix) that don't exist on Vercel serverless — unpdf ships the polyfilled build.
 *
 * Scanned-PDF guard: an image-only (scanned) PDF has no text layer, so extraction returns
 * ~nothing. We flag it when a non-trivially-sized file yields almost no text, and the caller
 * surfaces a clear Hebrew error. OCR is deferred (see TODO.md [P3+]).
 */
import { extractText, getDocumentProxy } from "unpdf";

/** Below this many extracted chars, for a file larger than SCANNED_MIN_BYTES, we treat it as scanned. */
const SCANNED_MIN_TEXT_CHARS = 100;
const SCANNED_MIN_BYTES = 100 * 1024; // 100KB

export interface ExtractResult {
  text: string;
  pages: number;
}

export async function extractPdfText(data: Uint8Array): Promise<ExtractResult> {
  // getDocumentProxy takes ownership of the buffer; pass a copy so callers can reuse `data`
  // (e.g. for the scanned-size check on the original bytes).
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { text: text ?? "", pages: totalPages ?? 0 };
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
