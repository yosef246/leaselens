# LeaseLens — Project Brief

> ⚠️ **Planning doc.** For the as-built truth see **`docs/IMPLEMENTATION.md`** (Supabase Auth not
> Clerk; endpoints `ask`/`review`/`rewrite`; `unpdf` not pdf-parse; 11 laws).

The authoritative spec is `MASTER_PROMPT.md` at the project root. This brief points the team at it.

## One-line
Full-stack AI web app that analyzes Hebrew residential rental contracts against Israeli rental law. Hebrew-first, RTL, portfolio project, solo, 4 weeks.

## Product flow
Upload Hebrew PDF → within ~60s: (1) Hebrew summary, (2) red flags with exact citations (contract + law), (3) RAG chat, (4) law-violation detection grounded in a pre-embedded Israeli-law corpus.

## Stack (locked)
Next.js 15 (App Router, Server Components, TS) · Tailwind + shadcn/ui · Vercel AI SDK ·
Supabase (Postgres + pgvector + Storage + Auth) · Claude `claude-sonnet-5` (analysis + chat) ·
OpenAI `text-embedding-3-small` (embeddings only) · unpdf · react-pdf · Deploy: Vercel + Supabase free tier.
<!-- as-built: auth is Supabase (not Clerk); PDF extraction is unpdf (not pdf-parse). See docs/IMPLEMENTATION.md -->

## Target laws (Phase 1 corpus)
- חוק השכירות והשאילה, תשל"א-1971
- חוק שכירות הוגנת, תשע"ז-2017
- חוק הגנת הדייר [נוסח משולב], תשל"ב-1972
Source: main.knesset.gov.il (public domain).

## Build order (from MASTER_PROMPT)
P0 Bootstrap → P1 Law corpus → P2 Upload+parse → P3 Analysis engine → P4 Viewer+red-flags UI →
P5 RAG chat → P6 Landing+polish → P7 Deploy+metrics. Stop after each phase, wait for "המשך".

## Principles
RTL-first · streaming everywhere · grounded citations only (answer "לא מצאתי מידע ודאי" if unsure) ·
Zod at all API boundaries · no dead code · free tier only · commit per acceptance.

## Secrets
Env vars live in `.env.local` (git-ignored), filled manually by the owner. Never hardcode keys.
Keys: Supabase (URL/anon/service_role), Anthropic, OpenAI. (No Clerk — auth is Supabase. PostHog not wired.)
