<div align="center">

# LeaseLens 📋

**AI that reads Israeli residential lease contracts against the law — in Hebrew, in seconds.**

Upload a lease PDF → get a cited, plain-Hebrew breakdown of problematic clauses → approve fixes →
download a corrected, signature-ready contract. Hebrew-first, fully RTL.

[![Live demo](https://img.shields.io/badge/Live_demo-leaselens-10b981?style=for-the-badge)](https://leaselens-delta.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js_15-000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-38bdf8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ecf8e?logo=supabase&logoColor=white)
![pgvector](https://img.shields.io/badge/pgvector-4169e1?logo=postgresql&logoColor=white)
![Claude](https://img.shields.io/badge/Claude_Sonnet_5-d97757)

</div>

> Israeli tenants routinely sign leases without knowing which clauses violate the law. LeaseLens
> reads the contract, compares each clause against a corpus of Israeli rental law, and returns an
> analysis grounded in exact citations — then generates a corrected contract.

<!-- Add 2–3 screenshots or a short GIF of the flow here: upload → flagged clauses → corrected PDF. -->

---

## What it does

- 📄 **Upload** a Hebrew lease PDF — text is extracted, chunked, and embedded.
- 🔎 **Detect** problematic clauses — ambiguous, one-sided, missing-by-law, illegal, or "trap" fine print.
- 📖 **Cite** the exact law behind every finding, in plain Hebrew, with a severity score.
- ✏️ **Fix** — edit and approve suggested rewrites, then download a corrected contract as a PDF.
- 💬 **Ask** free-text questions about the contract and get streamed, source-cited answers.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React Server Components), React 19, TypeScript |
| UI | Tailwind CSS v4, Radix UI, Hebrew-first RTL, light/dark |
| Data | Supabase — Postgres + **pgvector**, Storage, Auth (SSR, RLS) |
| LLM | Claude Sonnet 5 via the Vercel AI SDK (`streamText` / `generateObject`) |
| Embeddings | OpenAI `text-embedding-3-small` (1536-dim) |
| PDF | `unpdf` (extraction) · `pdf-lib` + embedded Heebo (generation) |
| Deploy | Vercel + Supabase |

## How it works

```
PDF upload ─▶ text extraction (unpdf) ─▶ chunking ─▶ OpenAI embeddings ─▶ pgvector
                                                                              │
   corrected PDF ◀─ pdf-lib (RTL) ◀─ Claude rewrite ◀── approved fixes       │
                                                                              ▼
        cited answer / flagged clauses ◀── Claude (structured) ◀── hybrid retrieval
                                                            (vector + keyword, RRF)
```

Every AI response streams to the client over SSE and is grounded in retrieved law/contract chunks —
the model only ever cites sources it was actually handed.

## Engineering highlights

The parts worth walking through:

1. **Hybrid RAG tuned for Hebrew.** Postgres has no Hebrew stemmer, so query-time normalization is
   hand-built: strip niqqud, drop attached one-letter prefixes (ה/ו/ב/ל/כ/מ/ש), and expand legal
   synonyms (פיקדון ↔ ערובה). Vector and keyword arms are fused with Reciprocal Rank Fusion, so a
   question about "פיקדון" still surfaces a clause worded as "ערובה". → `lib/rag/query.ts`

2. **Hebrew RTL PDF generation from scratch.** `pdf-lib` draws left-to-right and performs no bidi,
   so the corrected contract is rendered with a hand-written bidi reordering pass over an embedded
   Heebo font — no headless browser, runs inside a serverless function. → `lib/pdf/`

3. **Structured, grounded LLM output.** Clause detection and rewriting use `generateObject` with Zod
   schemas; law citations are anchored to numbered markers that are *mechanically validated* against
   what was retrieved — the model cannot invent a section number. → `lib/ai/`

4. **Prompt caching with measured savings.** `cache_control` on the stable system prompt, plus an
   `ai_usage_logs` telemetry table; a verification harness measures **~66% input-token savings** on
   repeat calls. → `lib/ai/usage.ts`, `pnpm test:caching`

5. **Engineering within hard constraints.** Everything fits Vercel's 60s serverless cap: live SSE
   progress, `thinking` tuned per call type for the latency/quality tradeoff, and a bounded section
   fan-out with a transparent in-product warning when a long contract is only partially scanned.

**Security:** every user table enforces Postgres Row-Level Security keyed on `auth.uid()`, behind a
data-access layer that always takes `userId` as its first argument.

## Project structure

```
src/
  app/                 # routes: landing, /demo, /dashboard, /contracts/[id](/review), auth, api
  components/          # UI (Radix), marketing sections, review + rewrite flows
  lib/
    ai/                # Claude wrappers, issue detection, contract rewrite, caching + usage
    rag/               # Hebrew query normalization, prompt assembly
    pdf/               # extraction, bidi, pdf-lib renderer + Heebo
    db/                # RLS-scoped data access (userId-first)
    supabase/          # SSR + admin clients
supabase/migrations/   # schema (applied manually — see below)
docs/IMPLEMENTATION.md # authoritative as-built reference
```

## Local development

```bash
pnpm install
cp .env.example .env.local   # Supabase / Anthropic / OpenAI keys
# Apply each supabase/migrations/00XX_*.sql in order (Supabase SQL editor or `supabase db push`)
pnpm embed-laws              # load the law corpus into law_chunks (once)
pnpm dev
```

Migrations are **not** auto-applied. Don't paste `data/laws/*.txt` into the SQL editor — that text
loads via `pnpm embed-laws`.

**Verification harnesses** (`node scripts/*.ts`, Node 22+):

| Command | Purpose |
|---|---|
| `pnpm ask:sample` | Offline RAG "ask" smoke test on the sample contract |
| `pnpm test:caching` | Verify prompt caching engages (expects `cache_read > 0`) |
| `pnpm ab:thinking` | A/B the review classifier across `thinking` modes (`THINKING_MODE=off\|low\|on`) |

## Limitations & tradeoffs

Deliberate scope for a free-tier deployment:

- **Partial scan on long contracts** — to fit the 60s serverless cap, `/review` analyzes the first
  ~16 sections and warns in the UI when a contract is truncated. Full coverage would use per-request
  batching or a higher-duration plan.
- **No billing** — pricing copy is illustrative; there's no payment or usage gating.
- **Residential leases only**, Hebrew, text-based PDFs (no OCR).
- **Not legal advice** — an assistive tool grounded in the Israeli Rental & Lending Law (1971), the
  Fair Rental Law (2017), and relevant case law; not a substitute for a lawyer.

---

<div align="center"><sub>Portfolio project · built with Next.js, Claude, and pgvector.</sub></div>
