/**
 * Hybrid chunker for uploaded rental contracts (P2).
 *
 * Strategy (per owner decision):
 *   1. Primary: split on numbered section headers — /^\s*(\d+[א-ת]?)\.?\s+/ (e.g. "1.", "1א.", "2 ").
 *   2. Fallback: if NO numbered sections are found at all, fixed-window the whole document
 *      (WINDOW_SIZE chars, WINDOW_OVERLAP overlap).
 *   3. Boundary rule: a numbered section longer than MAX_SECTION_CHARS is itself windowed
 *      (long clauses carry sub-clauses) — each window keeps the section_number.
 *
 * Contrast with the law chunker (src/lib/chunking/hebrew-law-chunker.ts): law text is highly
 * structured (סעיף/סימן/פרק); contracts are messy and free-form, hence the fixed-window fallback.
 */

export interface ContractChunk {
  /** Detected section number ("1", "1א", ...) or null for fallback/preamble chunks. */
  section_number: string | null;
  /** The chunk body. */
  text: string;
  /** 0-based sequential index within the contract (stable ordering). */
  chunk_index: number;
}

const SECTION_RE = /^\s*(\d+[א-ת]?)\.?\s+/;
const WINDOW_SIZE = 500;
const WINDOW_OVERLAP = 50;
const MAX_SECTION_CHARS = 1500;

interface RawSection {
  section_number: string | null;
  text: string;
}

/** Normalize line endings and strip trailing spaces; keep newlines (section detection needs them). */
function normalize(raw: string): string {
  const cleaned = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();

  // Extraction-agnostic section detection: put every numbered marker ("7. ", "13. ") at the
  // start of a line, whether the PDF extractor preserved line breaks (pdf-parse) or flowed the
  // text together (unpdf/pdfjs on serverless). Only a digit+dot FOLLOWED BY whitespace and
  // PRECEDED BY inline whitespace is treated as a marker — dates (01.08.2026) and amounts
  // (5,000) don't have a dot-then-space, so they're left alone.
  return cleaned.replace(/[ \t]+(\d{1,2}[א-ת]?\.[ \t])/g, "\n$1");
}

/** Sliding fixed-size window over a single string. */
function windowSplit(text: string, size = WINDOW_SIZE, overlap = WINDOW_OVERLAP): string[] {
  const clean = text.trim();
  if (clean.length <= size) return clean.length > 0 ? [clean] : [];
  const out: string[] = [];
  const step = size - overlap;
  for (let start = 0; start < clean.length; start += step) {
    out.push(clean.slice(start, start + size).trim());
    if (start + size >= clean.length) break;
  }
  return out.filter((w) => w.length > 0);
}

/** Group lines into sections, opening a new one at each numbered header. */
function splitIntoSections(text: string): RawSection[] {
  const lines = text.split("\n");
  const sections: RawSection[] = [];
  let current: RawSection = { section_number: null, text: "" };

  const flush = () => {
    if (current.text.trim().length > 0) {
      sections.push({ section_number: current.section_number, text: current.text.trim() });
    }
  };

  for (const line of lines) {
    const match = line.match(SECTION_RE);
    if (match) {
      flush();
      current = { section_number: match[1], text: line };
    } else {
      current.text += current.text ? `\n${line}` : line;
    }
  }
  flush();
  return sections;
}

export function chunkContract(rawText: string): ContractChunk[] {
  const text = normalize(rawText);
  if (text.length === 0) return [];

  const sections = splitIntoSections(text);
  const hasNumbered = sections.some((s) => s.section_number !== null);

  const chunks: ContractChunk[] = [];
  let index = 0;
  const push = (section_number: string | null, body: string) => {
    const t = body.trim();
    if (t.length > 0) chunks.push({ section_number, text: t, chunk_index: index++ });
  };

  if (!hasNumbered) {
    // No numbered structure → pure fixed-window fallback over the whole document.
    for (const w of windowSplit(text)) push(null, w);
    return chunks;
  }

  // Numbered structure: one chunk per section; window sections that exceed the boundary.
  for (const section of sections) {
    if (section.text.length <= MAX_SECTION_CHARS) {
      push(section.section_number, section.text);
    } else {
      for (const w of windowSplit(section.text)) push(section.section_number, w);
    }
  }
  return chunks;
}
