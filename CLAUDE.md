# LeaseLens — project notes for Claude

Hebrew-first (RTL) AI app that analyzes Israeli residential lease contracts. Next.js 15 (App
Router) · Supabase (Postgres + pgvector + Storage + Auth) · Vercel AI SDK + Anthropic Claude ·
OpenAI embeddings. RAG throughout — retrieve relevant law/contract chunks, never full-context.

## AI / model conventions
- Model id `claude-sonnet-5` is defined in **4 places** (no single const yet): `src/lib/ai/issue-detection.ts`,
  `src/lib/ai/rewrite-contract.ts`, `src/app/api/contracts/[id]/ask/route.ts`, and exported as
  `CLAUDE_MODEL` from `src/lib/ai/claude.ts`. Keep them in sync on any model change; pricing in
  `src/lib/ai/usage.ts` is per-model and must be updated too.
- All Claude calls go through the **Vercel AI SDK** (`streamText`/`generateObject`), not the raw
  `@anthropic-ai/sdk`. Prompt caching is applied via `cachedSystem()` on the system prompt only
  (the byte-stable prefix) — the RAG-retrieved chunks vary per request and are intentionally not cached.
- **`/review` (issue-detection) runs with `thinking: { type: "disabled" }` on purpose.** sonnet-5
  defaults to adaptive thinking, which ~2x'd latency and pushed the 40-call fan-out past Vercel's
  60s cap (504). An A/B on the sample contract showed both modes catch the serious clauses; the
  diffs were categorization + borderline items + run-to-run noise, with no ground truth to call a
  winner. **`/rewrite` also runs `thinking: "disabled"` AND fans out per fixed section** (one small
  `generateObject` per approved clause, bounded concurrency in `rewrite-contract.ts`). A single
  combined call ran ~50s and intermittently crept past the 60s cap when output ran long (Claude
  finished + logged usage, but the function was killed before the client got the PDF). Per-section
  fan-out bounds wall-clock by the slowest clause (~15-25s), not the sum.

## Migrations
Supabase migrations live in `supabase/migrations/`. They are NOT auto-applied — run each new one
in the Supabase SQL editor (or `supabase db push`). Current head: `0011_user_feedback.sql`.
Do NOT paste `data/laws/*.txt` (law corpus text) into the SQL editor — those load via `pnpm embed-laws`.

## Verification harnesses (scripts/, run with `node scripts/*.ts` — Node 22+ strips types)
- `pnpm ab:thinking` — A/B the review classifier across thinking modes on the sample contract.
  `THINKING_MODE=off|low|on` runs a single mode; unset runs the on-vs-off A/B. See README.
- `pnpm test:caching` — verify prompt caching actually engages (cache_read > 0).
- `pnpm ask:sample` — offline RAG ask smoke test.

## TODO
- **future: build ground-truth fixture in `fixtures/annotated-contracts/`** — labeled clauses with
  expected {category, severity, law} — will enable a DEFINITIVE A/B on thinking / effort / model
  changes (today's A/B shows divergence + speed, not accuracy, because there's no labeled set).
  The `user_feedback` table (0011) + the "השופט טעה?" button are the real-world collection source
  for this — periodically review that table to seed the fixture.
