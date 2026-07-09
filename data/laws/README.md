# Law corpus — `data/laws/`

The P1 law corpus: the source of truth for LeaseLens's legal grounding
(see `docs/DECISIONS.md` D1-AMENDED).

## Why the `.txt` files aren't in git

The `*.txt` law files are **git-ignored** (`.gitignore`: `/data/laws/*.txt`). They are
hand-prepared source material, not application code. Only `manifest.json` (the index + metadata)
and this README are committed. To populate a fresh clone, obtain the `.txt` files (below), then
run `pnpm embed-laws`.

## Source

Public-domain Israeli statutes, transcribed from **he.wikisource.org** (one wiki page per law).
See each file's law title/year in `manifest.json`. These are official consolidated texts
(נוסח משולב where applicable), public domain.

> `scripts/scrape-laws.ts` is a **best-effort** fetcher behind the `FEATURE_LAW_SCRAPING_ENABLED`
> flag (default off). It is NOT part of P1 and is not guaranteed to reproduce the exact files —
> the hand-verified `.txt` files remain the source of truth.

## The 11 laws (see `manifest.json` for full metadata)

| File | Law | Priority |
|---|---|---|
| `01-contracts-general.txt` | חוק החוזים (חלק כללי), התשל״ג-1973 | core |
| `02-contracts-remedies.txt` | חוק החוזים (תרופות בשל הפרת חוזה), התשל״א-1970 | core |
| `03-sale.txt` | חוק המכר, התשכ״ח-1968 | core |
| `04-bailees.txt` | חוק השומרים, התשכ״ז-1967 | core |
| `05-land.txt` | חוק המקרקעין, התשכ״ט-1969 | core |
| `06-standard-contracts.txt` | חוק החוזים האחידים, התשמ״ג-1982 | high |
| `07-tenant-protection.txt` | חוק הגנת הדייר [נוסח משולב], התשל״ב-1972 | high |
| `08-unjust-enrichment.txt` | חוק עשיית עושר ולא במשפט, התשל״ט-1979 | secondary |
| `09-guarantee.txt` | חוק הערבות, התשכ״ז-1967 | secondary |
| `10-limitations.txt` | חוק ההתיישנות, התשי״ח-1958 | secondary |
| `rental-law-fixed.txt` | חוק השכירות והשאילה, התשל״א-1971 | core |

The residential-lease / "fair rental" provisions (2017 amendment) live inside
`rental-law-fixed.txt` as sections **25א–25טו** (סימן ו׳: חוזה שכירות למגורים), incl. §25י (ערובה).

## File format (parsed by `src/lib/chunking/hebrew-law-chunker.ts`)

```
חוק השומרים, תשכ״ז–1967            ← title line (law name, year)
פרק א׳: ...                         ← chapter heading (context, tracked)
סימן א׳: ...                        ← sign heading (context, tracked)
1. שמירה ושומרים [תיקון: ...]       ← section: ^<N><Hebrew-letter suffix?>. <title> [תיקון]
(א)                                 ← sub-clause marker (folded into the section's chunk)
שמירת נכס היא החזקתו כדין...         ← sub-clause body
(ב)
...
```

The chunker splits by section (`^\d+[א-ת]*\.`), folds sub-clauses into the section's text,
carries the enclosing `פרק`/`סימן` as chunk metadata, and **drops repealed/empty sections**
(e.g. `12. [תיקון: תשע״ה]`, bare `35.`). Wikisource artifacts (signature blocks, `קטגוריה:`
tags, appendices/`תוספת`) are stripped.

## Regenerating the embeddings

```bash
# 1. apply the migration once (Supabase SQL editor or `supabase db push`):
#    supabase/migrations/0001_law_chunks.sql
# 2. with OPENAI_API_KEY + Supabase keys in .env.local:
pnpm embed-laws        # 645 chunks → law_chunks (idempotent)
pnpm query-laws "השבת ערבות בסיום שכירות"   # sanity check → §25י at #1
```
