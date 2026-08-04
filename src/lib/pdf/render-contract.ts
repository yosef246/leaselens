/**
 * Renders a rewritten contract to a PDF (pdf-lib), Hebrew-first / RTL, in Heebo.
 *
 * pdf-lib gives us a pure-JS PDF writer that runs in Vercel's Node runtime with no headless
 * browser and no third-party service — so the user's contract text never leaves our infra. We
 * embed Heebo via fontkit, word-wrap in logical order (widths are order-independent), then reorder
 * each line to visual order (lib/pdf/bidi) and right-align it for RTL.
 *
 * Font files ship to the serverless function via next.config's outputFileTracingIncludes; we read
 * them from process.cwd() at call time.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { fixRtlNumerals } from "@/lib/pdf/bidi";
import { D2_DISCLAIMER } from "@/lib/rag/prompt";

export interface RewriteSection {
  number: string | null;
  text: string;
}
export interface RewriteDocument {
  title: string;
  sections: RewriteSection[];
}

// A4 in points.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const RIGHT_EDGE = PAGE_W - MARGIN;
const CONTENT_W = PAGE_W - MARGIN * 2;

const SIZE_TITLE = 20;
const SIZE_BODY = 11;
const SIZE_FOOTER = 8;
const LINE_FACTOR = 1.5;

const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.42, 0.42, 0.46);

async function loadFont(file: string): Promise<Uint8Array> {
  const p = path.join(process.cwd(), "src", "lib", "pdf", "fonts", file);
  return new Uint8Array(await readFile(p));
}

// Heebo (subsetted) carries no emoji/pictograph glyphs, so any such character renders as tofu (▯).
// The disclaimer's leading ⚠️ is the one that actually occurs; strip the whole class defensively so
// nothing stray ever reaches the page. Legal contract text contains none of these. ₪ (U+20AA) and
// en-dash (U+2013) sit below this range and are preserved.
function stripUnsupported(text: string): string {
  return text
    .replace(/[\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{1F000}-\u{1FAFF}]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .trimStart();
}

/** Word-wrap logical text to lines that fit maxWidth (measured with the embedded font). */
function wrapLogical(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const rawParagraph of text.split(/\n+/)) {
    const words = rawParagraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || current === "") {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/** RTL-aware document cursor: adds pages as needed, draws right-aligned reordered lines. */
class Cursor {
  page: PDFPage;
  y: number;
  constructor(private doc: PDFDocument, private regular: PDFFont, private bold: PDFFont) {
    this.page = doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  private ensureSpace(lineHeight: number) {
    if (this.y - lineHeight < MARGIN) {
      this.page = this.doc.addPage([PAGE_W, PAGE_H]);
      this.y = PAGE_H - MARGIN;
    }
  }

  /** Draw a block of logical text, wrapped + RTL-reordered + right-aligned. */
  drawBlock(text: string, opts: { size?: number; bold?: boolean; color?: typeof INK; gapAfter?: number } = {}) {
    const size = opts.size ?? SIZE_BODY;
    const font = opts.bold ? this.bold : this.regular;
    const color = opts.color ?? INK;
    const lineHeight = size * LINE_FACTOR;

    for (const logicalLine of wrapLogical(stripUnsupported(text), font, size, CONTENT_W)) {
      this.ensureSpace(lineHeight);
      // Draw in LOGICAL order (fontkit handles Hebrew RTL); only fix embedded numerals.
      const drawn = fixRtlNumerals(logicalLine);
      const w = font.widthOfTextAtSize(drawn, size);
      this.page.drawText(drawn, { x: RIGHT_EDGE - w, y: this.y - size, size, font, color });
      this.y -= lineHeight;
    }
    if (opts.gapAfter) this.y -= opts.gapAfter;
  }

  drawDivider() {
    this.ensureSpace(12);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: RIGHT_EDGE, y: this.y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.87),
    });
    this.y -= 12;
  }
}

export async function renderContractPdf(doc: RewriteDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    loadFont("Heebo-Regular.ttf"),
    loadFont("Heebo-Bold.ttf"),
  ]);
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });

  const cursor = new Cursor(pdf, regular, bold);

  cursor.drawBlock(doc.title, { size: SIZE_TITLE, bold: true, gapAfter: 10 });
  cursor.drawDivider();

  // Long clauses get split across several ingestion chunks that all carry the same section number.
  // Coalesce consecutive same-number sections so a clause renders as ONE block instead of repeating
  // (e.g. "סעיף 9" appeared 3× before this). We don't draw a separate "סעיף N" heading: the source
  // text already opens each clause with its own number ("4. דמי השכירות"), so an added heading both
  // duplicated that number and multiplied per chunk.
  const sections: RewriteSection[] = [];
  for (const s of doc.sections) {
    const prev = sections[sections.length - 1];
    if (prev && s.number !== null && prev.number === s.number) {
      prev.text = `${prev.text}\n${s.text}`;
    } else {
      sections.push({ number: s.number, text: s.text });
    }
  }

  for (const section of sections) {
    cursor.drawBlock(section.text, { gapAfter: 12 });
  }

  cursor.drawDivider();
  cursor.drawBlock(D2_DISCLAIMER, { size: SIZE_FOOTER, color: MUTED });

  pdf.setTitle(doc.title);
  pdf.setProducer("LeaseLens");
  return pdf.save();
}
