# LeaseLens

Hebrew-first (RTL) AI web app that analyzes Israeli residential lease contracts against Israeli
rental law. Upload a PDF → get a cited Hebrew analysis, proactive problem-clause detection, an
AI-rewritten corrected contract, and a grounded RAG chat.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres + pgvector + Storage + Auth) · Vercel AI
SDK + Anthropic `claude-sonnet-5` · OpenAI `text-embedding-3-small` · deployed on Vercel.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase / Anthropic / OpenAI keys
# Apply every migration in supabase/migrations/ (Supabase SQL editor or `supabase db push`)
pnpm embed-laws              # load the law corpus into law_chunks (once)
pnpm dev
```

Migrations are **not** auto-applied — run each `supabase/migrations/00XX_*.sql` in order. Do **not**
paste `data/laws/*.txt` into the SQL editor; that text loads via `pnpm embed-laws`.

## Scripts / verification harnesses

Run with `node scripts/*.ts` (Node 22+ strips TypeScript). All need `.env.local` populated.

| Command | What it does |
|---|---|
| `pnpm ask:sample` | Offline RAG "ask" smoke test against the sample contract. |
| `pnpm test:caching` | Verifies Anthropic prompt caching actually engages (5 calls; expects `cache_read > 0`). |
| `pnpm ab:thinking` | Review issue-detection harness — measures `thinking`'s effect on quality + latency. |

### `pnpm ab:thinking`

Mirrors the exact `/review` classification (same system prompt, schema, retrieval, `MAX_SECTIONS`,
`CONCURRENCY`) over the sample contract, changing **only** the `thinking` config. Both A/B arms
share one retrieval pass; caching is off for clean latency.

```bash
pnpm ab:thinking                    # A/B: thinking ON (adaptive) vs OFF (disabled) — full compare
THINKING_MODE=off pnpm ab:thinking  # single run, thinking disabled (current production setting)
THINKING_MODE=low pnpm ab:thinking  # single run, adaptive thinking + effort:low
THINKING_MODE=on  pnpm ab:thinking  # single run, adaptive thinking (sonnet-5 default)
```

**Why review runs thinking-OFF in production:** sonnet-5 defaults to adaptive thinking, which
~2x'd per-call latency and pushed the 40-call fan-out past Vercel's 60s cap (504). The A/B showed
both modes catch the serious clauses; the diffs were categorization + borderline items + run-to-run
noise. There is **no ground-truth set yet**, so the harness shows divergence + speed, not accuracy.

> **Ground truth (TODO):** the `user_feedback` table (migration 0011) + the "השופט טעה?" button on
> the review screen collect real corrections. Periodically review that table to build
> `fixtures/annotated-contracts/` — a labeled set that will enable a *definitive* A/B on
> thinking / effort / model changes.

## Deploying

`main` auto-deploys on Vercel. After merging a change that adds a migration, **run that migration in
the production Supabase project** before the new code paths are exercised.
