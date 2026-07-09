/**
 * Best-effort live-scraping stub, gated by FEATURE_LAW_SCRAPING_ENABLED (default false/unset).
 *
 * Per docs/DECISIONS.md D1 / D1-AMENDED: live Knesset/wikisource scraping is explicitly NOT part
 * of any P1 completion criterion. `data/laws/*.txt` (driven by data/laws/manifest.json) is the
 * single source of truth, hand-prepared/curated by the owner. This script:
 *   - is a no-op that exits 0 with a notice when the flag is off (the default),
 *   - when explicitly enabled, only ever WRITES the `data/laws/*.txt` fallback files -- it NEVER
 *     writes to the database. embed-laws.ts is the only script that touches Supabase, and it
 *     never invokes this script or checks this flag.
 *   - is best-effort: a failed fetch for one law logs a warning and moves on, it does not throw.
 *
 * Usage: node scripts/scrape-laws.ts   (also wired as `pnpm scrape-laws`)
 */
import { writeFileSync } from "node:fs";
import { getManifestDocuments, resolveLawFilePath } from "../src/lib/laws/manifest.ts";

const FEATURE_FLAG = "FEATURE_LAW_SCRAPING_ENABLED";
const WIKISOURCE_BASE = "https://he.wikisource.org/wiki";

function isEnabled(): boolean {
  const raw = (process.env[FEATURE_FLAG] ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1";
}

/** Best-effort fetch of a law's plain text from he.wikisource.org (matches manifest.source).
 * Returns null on any failure -- callers must treat this as "skip, don't fail the run". */
async function tryFetchLawText(title: string): Promise<string | null> {
  try {
    const url = `${WIKISOURCE_BASE}/${encodeURIComponent(title.replace(/\s+/g, "_"))}?action=raw`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const text = await res.text();
    return text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  if (!isEnabled()) {
    console.log(
      `[scrape-laws] ${FEATURE_FLAG} is off (default). This is expected -- live scraping is ` +
        "NOT part of P1. The data/laws/*.txt files (driven by data/laws/manifest.json) remain " +
        "the single source of truth. Exiting 0."
    );
    return;
  }

  console.log(
    `[scrape-laws] ${FEATURE_FLAG} is enabled -- attempting best-effort fetch from wikisource. ` +
      "This NEVER writes to the database; it only overwrites data/laws/*.txt fallback files, " +
      "which embed-laws.ts subsequently reads."
  );

  const documents = getManifestDocuments();
  let updated = 0;
  let skipped = 0;

  for (const doc of documents) {
    const text = await tryFetchLawText(doc.title);
    if (!text) {
      console.warn(`[scrape-laws] could not fetch "${doc.title}" -- keeping existing ${doc.fileName} as-is.`);
      skipped++;
      continue;
    }
    const filePath = resolveLawFilePath(doc.fileName);
    writeFileSync(filePath, text, "utf-8");
    console.log(`[scrape-laws] wrote ${doc.fileName} (${text.length} chars) from wikisource.`);
    updated++;
  }

  console.log(`\n[scrape-laws] Done. Updated ${updated} file(s), skipped ${skipped} (best-effort).`);
}

main().catch((err) => {
  // Best-effort by design: log and exit 0 rather than failing a build/CI step over a scraper.
  console.error("[scrape-laws] unexpected error (non-fatal, best-effort script):", err);
});
