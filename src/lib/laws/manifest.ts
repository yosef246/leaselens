/**
 * Typed loader for data/laws/manifest.json.
 *
 * Per docs/DECISIONS.md D1-AMENDED, the manifest (not a directory glob) is the single source of
 * truth for which .txt files belong to the P1 law corpus, and for every chunk's law-level
 * metadata (title, short_title, year, year_hebrew, category, priority). scripts/embed-laws.ts
 * MUST iterate `getManifestDocuments()` -- never `fs.readdir(LAWS_DIR)`.
 *
 * Pure-ish I/O module: reads one JSON file from disk, validates its shape, and caches it.
 * No network calls.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const LawManifestEntrySchema = z.object({
  title: z.string().min(1),
  short_title: z.string().min(1),
  year_hebrew: z.string().min(1),
  year: z.number().int(),
  category: z.string().min(1),
  priority: z.enum(["core", "high", "secondary"]),
});

const LawManifestSchema = z.object({
  corpus: z.string(),
  version: z.string(),
  language: z.string(),
  source: z.string(),
  documents: z.record(z.string(), LawManifestEntrySchema),
});

export type LawManifestEntry = z.infer<typeof LawManifestEntrySchema>;
export type LawManifest = z.infer<typeof LawManifestSchema>;

/** A manifest entry with its `.txt` filename attached -- the shape embed-laws.ts iterates. */
export interface LawManifestDocument extends LawManifestEntry {
  fileName: string;
}

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
// This file lives at src/lib/laws/manifest.ts -> repo root is three levels up.
export const REPO_ROOT = path.resolve(MODULE_DIR, "../../../");
export const LAWS_DIR = path.join(REPO_ROOT, "data", "laws");
export const MANIFEST_PATH = path.join(LAWS_DIR, "manifest.json");

let cachedManifest: LawManifest | null = null;

/** Reads + validates data/laws/manifest.json. Cached after the first successful load of the
 * default path (pass an explicit `manifestPath` in tests to bypass the cache). */
export function loadLawManifest(manifestPath: string = MANIFEST_PATH): LawManifest {
  const useCache = manifestPath === MANIFEST_PATH;
  if (useCache && cachedManifest) return cachedManifest;

  const raw = readFileSync(manifestPath, "utf-8");
  const parsed = LawManifestSchema.parse(JSON.parse(raw));

  if (useCache) cachedManifest = parsed;
  return parsed;
}

/** Manifest documents as an ordered array (JSON insertion order == the 11-law order from
 * D1-AMENDED), each tagged with its `fileName`. This is what embed-laws.ts iterates. */
export function getManifestDocuments(manifestPath?: string): LawManifestDocument[] {
  const manifest = loadLawManifest(manifestPath);
  return Object.entries(manifest.documents).map(([fileName, entry]) => ({
    fileName,
    ...entry,
  }));
}

/** Resolves a manifest-listed filename to its absolute path under data/laws/. */
export function resolveLawFilePath(fileName: string): string {
  return path.join(LAWS_DIR, fileName);
}
