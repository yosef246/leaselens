/**
 * Numeral fix for RTL PDF text (pdf-lib + fontkit).
 *
 * IMPORTANT: pdf-lib draws through fontkit, and **fontkit already applies correct Hebrew RTL
 * shaping** when it's handed logical-order text. So contract text must be drawn in LOGICAL order —
 * do NOT pre-reverse it (an earlier full-line "bidi" reversal double-reversed everything and
 * rendered the Hebrew backwards).
 *
 * The one thing fontkit gets wrong is a multi-digit number embedded in an RTL run: "10,000" comes
 * out as "000,01". Pre-reversing the characters of each numeric token cancels that out, so numbers,
 * amounts, and dates display left-to-right correctly. Verified by rasterizing the output.
 */

// A numeric token: digits, with internal separators (thousands "," / decimal "." / date "/").
const NUMERIC_TOKEN = /[0-9]+(?:[.,/][0-9]+)*/g;

/** Reverse each numeric token so it reads correctly after fontkit's RTL layout. */
export function fixRtlNumerals(line: string): string {
  return line.replace(NUMERIC_TOKEN, (m) => [...m].reverse().join(""));
}
