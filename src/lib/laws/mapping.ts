/**
 * D6 (docs/DECISIONS.md): this file is the ONLY place in the codebase that derives
 * `category` / `is_binding` for law_chunks rows. The parser (hebrew-law-chunker.ts),
 * embed-laws.ts, and any future consumer MUST import `classifyLaw` from here rather than
 * re-deriving these fields themselves.
 *
 * Per D1-AMENDED, all 11 P1-corpus documents are enacted, in-force Knesset statutes, so
 * `is_binding` is unconditionally `true`. `category` is read straight from the owner-curated
 * manifest entry (data/laws/manifest.json) -- no per-file guessing logic lives here or anywhere
 * else. The column still exists on law_chunks (and this function still exists as a single
 * choke point) for the day a non-binding source (draft bill, commentary, etc.) is added.
 */
import type { LawManifestEntry } from "./manifest.ts";

export interface LawClassification {
  category: string;
  is_binding: boolean;
}

export function classifyLaw(entry: Pick<LawManifestEntry, "category">): LawClassification {
  return {
    category: entry.category,
    is_binding: true,
  };
}
