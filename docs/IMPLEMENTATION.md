# LeaseLens — As-Built (source of truth)

The other files in `docs/` are the **original plan** (written by the dev-team agents up front). The
build diverged from that plan in several places. **This file is the authoritative record of what was
actually built.** Where a planning doc conflicts with this file, this file wins.

## Auth — Supabase Auth (NOT Clerk)
The plan specified Clerk; the implementation uses **Supabase Auth** end to end.
- `@supabase/ssr` with a request-scoped server client + `src/middleware.ts` → `updateSession`
  (session refresh + redirect-to-`/sign-in` for protected routes; public metadata routes and
  `/`, `/demo`, and the auth pages are excluded).
- Email/password **and** Google OAuth. Custom Hebrew auth pages: `/sign-in`, `/sign-up`,
  `/forgot-password`, `/auth/reset-password`, `/auth/callback`, `/auth/signout`.
- Authorization is **Postgres RLS keyed on `auth.uid()`** (every user table scopes via the parent
  contract), plus the D4 `src/lib/db/*.ts` access layer that takes `userId` first. There is **no**
  service-role-only model, no Clerk JWT bridge, and **no `profiles` table / Clerk webhook** — Supabase
  owns the user identity.
- Env keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  (build scripts only), `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. No Clerk keys. PostHog not wired.

## API endpoints (actual)
| Route | Purpose |
|---|---|
| `POST /api/contracts/upload` | Store PDF + create `contracts` row |
| `POST /api/contracts/[id]/process` | Parse (unpdf) → chunk → embed → `contract_chunks` |
| `POST /api/contracts/[id]/ask` | Streaming RAG Q&A (was planned as `analyze`/`chat`) |
| `POST /api/contracts/[id]/review` | Proactive problem-clause detection → `contract_issues` |
| `POST/PATCH /api/contracts/[id]/rewrite` | SSE: AI-corrected contract → PDF in Storage |
| `POST /api/contracts/[id]/feedback` | Human feedback on the judge → `user_feedback` |

There is **no** `/api/contracts/[id]/analyze`, `/api/contracts/[id]/chat`, `/api/admin/metrics`,
or `/api/webhooks/clerk`. The `/admin/metrics` dashboard was not built.

## Pages (actual)
`/` (landing), `/demo`, `/about`, `/how-it-works`, `/blog` + `/blog/[slug]`, `/dashboard` (the
contract list + uploader), `/contracts/[id]` (results + RAG chat), `/contracts/[id]/review`
(problem clauses + rewrite trigger + feedback), `/dev`, plus the auth pages. No `/upload` page and no
singular `/contract/[id]`.

## Models & RAG
- LLM: **`claude-sonnet-5`** via the Vercel AI SDK (`streamText`/`generateObject`), NOT the raw
  `@anthropic-ai/sdk`. The model id is centralized as `CLAUDE_MODEL` in `src/lib/ai/claude.ts`.
- Embeddings: OpenAI `text-embedding-3-small` (1536d).
- Retrieval is **hybrid** (vector + keyword RRF, migration 0007) with Hebrew query normalization
  (`src/lib/rag/query.ts`) — not vector-only.
- `/review` runs with `thinking: disabled`; `/rewrite` keeps thinking on (see CLAUDE.md).
- **Prompt caching** on the system prompt via `cachedSystem()`, with per-call cost/token telemetry
  to `ai_usage_logs` (`src/lib/ai/usage.ts` + `claude.ts`).

## Law corpus
**11 Israeli laws** under `data/laws/*.txt` (not the 3 originally scoped), loaded into `law_chunks`
via `pnpm embed-laws`.

## Database (migrations 0001–0011)
`law_chunks`, `contracts`, `contract_chunks`, `contract_issues` (problem clauses — the concept the
plan called `red_flags`), `rewritten_contracts`, `ai_usage_logs`, `user_feedback`, plus the
`match_*_hybrid` RPCs and the `contracts` / `rewritten-contracts` Storage buckets. No `profiles`
table. Migrations are applied manually (Supabase SQL editor / `supabase db push`).

## PDF
Extraction uses **`unpdf`** (serverless-friendly pdfjs), not `pdf-parse`. The corrected-contract PDF
is generated in-process with **`pdf-lib` + vendored Heebo** (RTL via `src/lib/pdf/bidi.ts`) — no
headless browser, no third-party service.
