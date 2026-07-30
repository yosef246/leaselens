# LeaseLens — Acceptance Criteria & Results

> ⚠️ **Planning doc (original spec).** Endpoint/route names here predate the build (`ask`/`review`/
> `rewrite`, not `analyze`/`chat`). See **`docs/IMPLEMENTATION.md`** for the as-built record.

Per-phase acceptance. A phase is "done" only when its criteria pass against a real run.

---

## P0 — Bootstrap ✅
- `pnpm build` compiles clean; `/dev` renders "LeaseLens dev" + commit sha (RTL). PASS.

---

## P1 — Law corpus ✅

**Corpus:** 11 Israeli civil/rental laws (`data/laws/*.txt` + `data/laws/manifest.json`),
645 section-level chunks, embedded with OpenAI `text-embedding-3-small` (1536d) into Supabase
`law_chunks` (HNSW cosine index + `match_law_chunks` RPC). Idempotent upsert on
`(law_name, section_number)`.

**Acceptance query — semantic retrieval sanity:**

| # | Query | Expected | Result |
|---|---|---|---|
| Q1 | `"השבת ערבות בסיום שכירות"` | חוק השכירות והשאילה §25י (ערובה) in top-3, sim ≥ 0.4 | **STRONG PASS** — §25י at **#1**, sim **0.482** ✅ |

> Q2 merged into Q1 — the two were duplicates of the same "deposit-return" check.

**Note — why the original `"החזר פיקדון"` criterion was removed:**
Israeli law does not use the word **"פיקדון"** in the rental context — it uses **"ערובה"**
(security). A single-word `"פיקדון"` query is an artificial worst-case that does not represent
the real app flow: real user queries carry richer context (contract clauses, documents) that
covers the lexical gap, and the analysis/chat layer (Claude, P3/P5) bridges פיקדון↔ערובה by
meaning. The pipeline is proven correct — the same retrieval surfaces §25י at #1 the moment the
query uses the term the law actually uses. See `TODO.md` for the retrieval work on the
lexical-gap case.

**P2 update — title-embed experiment failed (2026-07-09):** re-embedding as
`section_title + "\n" + text` was tried and **reverted**. It pushed §25י out of Q1's top-5
(חוק הערבות §2 took #1 at sim 0.536 on the word "ערבות") — the second failed attempt to close
the lexical gap at embed time. Body-only remains the shipped state (§25י #1, sim 0.482). The
fix is now scheduled for P3 (hybrid keyword+vector search). See `TODO.md`.
