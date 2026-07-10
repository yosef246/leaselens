# TODO — Retrieval Improvements Backlog

## P2 — title-embed: TRIED, FAILED ❌ (2026-07-09)
- [x] ~~Embed `section_title + "\n" + text` (title only).~~ **Regressed Q1 — reverted to body-only.**
      On `"השבת ערבות בסיום שכירות"`, prepending the title pushed §25י **out of top-5**
      entirely; חוק הערבות §2 took #1 (sim 0.536) purely on the word "ערבות"/"ערב".
      Body-only keeps §25י at #1 (sim 0.482). This is the **second** failed metadata-augment
      experiment (first: title+sign+chapter) — same root cause: text-embedding-3-small is
      lexical, not semantic, on Hebrew, so any added surface tokens amplify word-match noise.
      **Conclusion: the lexical gap cannot be closed at embed time. It moves to P3 (hybrid).**

## P3+ (contract processing)
- [ ] Add OCR fallback for scanned contracts (tesseract.js or AWS Textract).
      Today: a scanned/image PDF is detected (text < 100 chars for a > 100KB file) and
      rejected with a clear Hebrew error (src/lib/pdf/extract.ts). OCR is out of free-tier
      scope — revisit if real users hit it.

## P3 (post-MVP, on real user feedback)
- [ ] Consider a re-ranker (bge-reranker-v2-m3 or Cohere Rerank) once we see real user
      failure cases in retrieval quality. MVP uses cosine + top-K only (no re-rank).
- [ ] Hybrid search: vector + tsvector keyword (Postgres FTS or pg_trgm).
      Bridges lexical gaps like פיקדון↔ערבות at query time without re-embedding.
- [ ] Consider text-embedding-3-large (3072d).
      Requires schema migration (vector(1536) → vector(3072)) + full re-embed.
      Only if hybrid + title-embed still leave measurable gaps.
