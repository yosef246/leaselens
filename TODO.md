# TODO — Retrieval Improvements Backlog

## P2 (recommended, cheap win)
- [ ] Embed `section_title + "\n" + text` instead of body-only.
      Best-practice RAG — title carries semantic signal. Cost: ~$0.005, ~30min code.

## P3 (post-MVP, on real user feedback)
- [ ] Hybrid search: vector + tsvector keyword (Postgres FTS or pg_trgm).
      Bridges lexical gaps like פיקדון↔ערבות at query time without re-embedding.
- [ ] Consider text-embedding-3-large (3072d).
      Requires schema migration (vector(1536) → vector(3072)) + full re-embed.
      Only if hybrid + title-embed still leave measurable gaps.
