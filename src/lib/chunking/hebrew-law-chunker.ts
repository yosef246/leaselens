/**
 * Pure parser for the P1 Hebrew law corpus (data/laws/*.txt). No I/O -- takes the raw file
 * text, returns the title line + an ordered array of section-level chunks.
 *
 * File format (per docs/DECISIONS.md D1-AMENDED):
 *   <title line>
 *   [optional table-of-contents / preface noise]
 *   פרק X: <chapter heading>          (context, tracked, not a chunk)
 *   סימן X: <sign heading>            (context, tracked, not a chunk; resets when a new פרק starts)
 *   <N><Hebrew-letter suffix?>. <section title> [תיקון: ...]
 *   (א)
 *   <sub-clause text, folded into the section's chunk text>
 *   (ב)
 *   <sub-clause text>
 *   ...next section...
 *
 * Design notes / deliberate deviations from the letter of the D1-AMENDED example regex,
 * verified against the real corpus (see backend-developer's closing report):
 *  - Section numbers use MULTI-letter Hebrew gematria suffixes in this corpus (e.g. "25יד",
 *    "25טו", not just single letters like "9א"), so the section-start regex allows
 *    zero-or-more Hebrew letters, not zero-or-one.
 *  - The corpus is wikisource-sourced and carries a few wiki-markup artifacts that are not law
 *    text: a trailing minister-signature block (`* NAME TITLE` lines) + `קטגוריה:...` category
 *    tag at the end of most files, and `סוג=הגדרה` markers before each defined term in a few
 *    definition sections. These are stripped as noise, not folded into any chunk.
 *  - Several files (05-land.txt, 07-tenant-protection.txt, rental-law-fixed.txt) end with a
 *    "תוספת" (schedule/appendix) that restarts its own "1. / 2. / ..." numbering. Folding that
 *    into the main section stream would collide with the law's real section 1/2/... under the
 *    `unique(law_name, section_number)` DB constraint and silently corrupt real sections on
 *    upsert. Parsing stops (and the appendix is dropped) as soon as a `תוספת` heading is seen
 *    after real section parsing has started. This is a deliberate, flagged scope limitation for
 *    P1 -- schedules are referenced BY sections (e.g. section 25ו references "התוספת הראשונה")
 *    but are not themselves independently-citable `law_chunks` rows in this schema.
 */

export interface LawChunk {
  chunk_index: number;
  section_number: string;
  section_title: string | null;
  chapter: string | null;
  sign: string | null;
  amendment: string | null;
  text: string;
  page_number: null;
}

export interface ParsedLaw {
  /** The raw first non-blank line of the file (informational; DB metadata comes from the
   * manifest per D1-AMENDED, not from parsing this string). */
  title: string;
  chunks: LawChunk[];
}

// Digit + zero-or-more Hebrew letters (handles "1", "9א", "14א", "25יד", "25כד", ...) + period.
const SECTION_START_RE = /^(\d+[א-ת]*)\.\s*(.*)$/;
const CHAPTER_RE = /^פרק\s/;
const SIGN_RE = /^סימן\s/;
// Wikisource artifacts: signature block bullets, category tag, definition-type markers.
const FOOTER_NOISE_RE = /^(\*|קטגוריה:)/;
const TEMPLATE_NOISE_RE = /^סוג=/;
// A schedule/appendix heading -- matched only against the WHOLE line (anchored both ends) so a
// section's body text that merely contains the word "תוספת" (e.g. "תוספת שיקבע שר המשפטים...")
// is never mistaken for a heading.
const APPENDIX_HEADING_RE =
  /^ה?תוספת(\s+(ראשונה|שניה|שנייה|שלישית|רביעית))?:?(\s*\|.*)?$/;
const AMENDMENT_RE = /\[תיקון:\s*([^\]]*)\]\s*$/;
// A continuation line that is JUST a sub-clause marker, e.g. "(א)", "(1)", "(א)(1)".
const BARE_MARKER_RE = /^(\([^()]*\))+$/;

interface OpenSection {
  sectionNumber: string;
  sectionTitle: string | null;
  amendment: string | null;
  chapter: string | null;
  sign: string | null;
  textLines: string[];
}

function stripPipeArtifact(s: string): string {
  const idx = s.indexOf("|");
  return (idx === -1 ? s : s.slice(0, idx)).trim();
}

function extractHeading(line: string): string {
  return stripPipeArtifact(line);
}

function openSection(line: string, chapter: string | null, sign: string | null): OpenSection {
  const match = SECTION_START_RE.exec(line);
  if (!match) {
    // Should never happen -- callers only invoke this after testing SECTION_START_RE.
    throw new Error(`hebrew-law-chunker: "${line}" is not a valid section-start line`);
  }
  const sectionNumber = match[1];
  let rest = match[2].trim();

  let amendment: string | null = null;
  const amendmentMatch = AMENDMENT_RE.exec(rest);
  if (amendmentMatch) {
    amendment = amendmentMatch[1].trim();
    rest = rest.slice(0, amendmentMatch.index).trim();
  }
  rest = stripPipeArtifact(rest);

  return {
    sectionNumber,
    sectionTitle: rest.length > 0 ? rest : null,
    amendment,
    chapter,
    sign,
    textLines: [],
  };
}

function buildChunk(section: OpenSection, index: number): LawChunk {
  return {
    chunk_index: index,
    section_number: section.sectionNumber,
    section_title: section.sectionTitle,
    chapter: section.chapter,
    sign: section.sign,
    amendment: section.amendment,
    text: section.textLines.join("\n").trim(),
    page_number: null,
  };
}

export function chunkHebrewLaw(rawText: string): ParsedLaw {
  const normalized = rawText.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  let title = "";
  let titleFound = false;
  let started = false;
  let currentChapter: string | null = null;
  let currentSign: string | null = null;
  let currentSection: OpenSection | null = null;
  let pendingMarker: string | null = null;
  const chunks: LawChunk[] = [];

  const closeSection = () => {
    if (currentSection) {
      if (pendingMarker) {
        currentSection.textLines.push(pendingMarker);
      }
      const chunk = buildChunk(currentSection, chunks.length);
      // Drop repealed / empty-body sections. Several sections across the corpus are repealed and
      // carry NO legal body text -- e.g. "23. ביטול", "12. [תיקון: תשע״ה]" (all of standard-
      // contracts פרק ג׳), or a bare "35." / "24." placeholder. They have no analyzable content,
      // and sending an empty string to the OpenAI embeddings API is rejected ("input cannot be an
      // empty string"). Skip them rather than merge (a repealed §35 is unrelated to §36). This
      // keeps chunk_index contiguous because we test before pushing. See the empty-chunk audit.
      if (chunk.text.length > 0) {
        chunks.push(chunk);
      }
      currentSection = null;
    }
    pendingMarker = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (FOOTER_NOISE_RE.test(line) || TEMPLATE_NOISE_RE.test(line)) continue;

    if (!titleFound) {
      title = line;
      titleFound = true;
      continue;
    }

    if (!started) {
      if (SECTION_START_RE.test(line)) {
        started = true;
        currentSection = openSection(line, currentChapter, currentSign);
      } else if (CHAPTER_RE.test(line)) {
        currentChapter = extractHeading(line);
        currentSign = null;
      } else if (SIGN_RE.test(line)) {
        currentSign = extractHeading(line);
      }
      // else: table-of-contents / preface noise (e.g. "חלק א׳: ...", "נוסח משולב: ..."), ignored
      continue;
    }

    // started === true: real section-body parsing.
    if (APPENDIX_HEADING_RE.test(line)) {
      closeSection();
      break; // stop parsing entirely -- see module doc for why appendices are dropped.
    }
    if (CHAPTER_RE.test(line)) {
      closeSection();
      currentChapter = extractHeading(line);
      currentSign = null;
      continue;
    }
    if (SIGN_RE.test(line)) {
      closeSection();
      currentSign = extractHeading(line);
      continue;
    }
    if (SECTION_START_RE.test(line)) {
      closeSection();
      currentSection = openSection(line, currentChapter, currentSign);
      continue;
    }

    // Continuation line: sub-clause marker or sub-clause/body text -- fold into the open section.
    if (BARE_MARKER_RE.test(line)) {
      pendingMarker = pendingMarker ? `${pendingMarker} ${line}` : line;
    } else {
      const combined = pendingMarker ? `${pendingMarker} ${line}` : line;
      currentSection?.textLines.push(combined);
      pendingMarker = null;
    }
  }
  closeSection();

  return { title, chunks };
}
