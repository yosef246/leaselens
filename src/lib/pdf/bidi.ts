/**
 * Pragmatic RTL reordering for pdf-lib.
 *
 * pdf-lib's drawText paints glyphs strictly left-to-right and performs NO bidi reordering, so
 * Hebrew handed to it in logical order renders reversed. This module reorders a single already-
 * wrapped line from logical order into the visual order pdf-lib should paint (left→right).
 *
 * Algorithm (a simplified Unicode Bidi, base direction RTL):
 *   1. Reverse the whole line. Pure-Hebrew runs are now in correct visual order, but LTR content
 *      (Latin letters, digits) is backwards.
 *   2. Re-reverse each maximal LTR run so numbers/Latin read correctly again.
 *
 * This is correct for the overwhelmingly common case in Hebrew legal text — Hebrew prose with
 * embedded numbers, currency, and occasional Latin. KNOWN LIMITATION: tightly-mixed number+Hebrew
 * tokens (e.g. a section marker like "25י") and nested bidi embeddings are not fully UBA-correct;
 * these are rare and cosmetic. Callers that need perfect shaping of such tokens should pre-split.
 */

// Strong LTR: Latin letters + ASCII digits. Everything else (Hebrew, spaces, punctuation) is
// treated as RTL/neutral and left in the fully-reversed order.
const LTR_CHAR = /[A-Za-z0-9]/;

/** Reorder one logical-order line into visual (paint) order for a base-RTL layout. */
export function toVisualRtl(line: string): string {
  const reversed = [...line].reverse();

  // Re-reverse each maximal run of LTR characters in place.
  let i = 0;
  while (i < reversed.length) {
    if (LTR_CHAR.test(reversed[i])) {
      let j = i;
      while (j < reversed.length && LTR_CHAR.test(reversed[j])) j++;
      // reverse [i, j)
      let a = i;
      let b = j - 1;
      while (a < b) {
        const t = reversed[a];
        reversed[a] = reversed[b];
        reversed[b] = t;
        a++;
        b--;
      }
      i = j;
    } else {
      i++;
    }
  }

  return reversed.join("");
}
