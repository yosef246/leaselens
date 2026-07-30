# LeaseLens — AI Rental Contract Analyzer

> ⚠️ **Original spec/prompt (historical).** Kept as the founding brief. The build diverged — see
> **`docs/IMPLEMENTATION.md`** for the as-built truth (Supabase Auth not Clerk; endpoints
> `ask`/`review`/`rewrite`; 11 laws; prompt caching + telemetry).

Build a full-stack AI app that analyzes Hebrew residential rental contracts
against Israeli rental law. Portfolio project, Hebrew-first, RTL, 4 weeks solo.

## Stack
Next.js 15 (App Router, Server Components, TS) · Tailwind + shadcn/ui ·
Vercel AI SDK · Supabase (Postgres + pgvector + Storage) · Clerk auth ·
Claude claude-sonnet-5 (analysis + chat) · OpenAI text-embedding-3-small ·
pdf-parse · react-pdf · Deploy: Vercel + Supabase free tier.

## Product Flow
Upload Hebrew PDF → 60s later: (1) Hebrew summary, (2) red flags with
exact citations, (3) RAG chat, (4) law-violation detection grounded in
pre-embedded Israeli law corpus.

## DB Schema (Supabase)
- `profiles(id text pk, email, created_at)` — mirrors Clerk IDs.
- `contracts(id uuid pk, user_id, file_name, storage_path, raw_text,
  summary, analysis_status, created_at)`.
- `contract_chunks(id, contract_id fk cascade, chunk_index, text,
  embedding vector(1536), page_number)`.
- `red_flags(id, contract_id fk cascade, severity [high|medium|low],
  category [illegal|unfair|ambiguous], contract_citation, law_citation,
  law_reference, explanation)`.
- `law_chunks(id, law_name, law_year, section_number, section_title,
  category, is_binding bool, text, embedding vector(1536))`.
- RPC `match_contract_chunks(contract_id, embedding, count)` and
  `match_law_chunks(embedding, count)` using cosine distance.

## Target Laws (Phase 1 corpus)
- חוק השכירות והשאילה, תשל"א-1971
- חוק שכירות הוגנת, תשע"ז-2017
- חוק הגנת הדייר [נוסח משולב], תשל"ב-1972
Source: main.knesset.gov.il (HTML/PDF, public domain).

## Phases — do in order, stop after each and ask "המשך?"

**P0 · Bootstrap (30m)** — `pnpm create next-app leaselens` + install
deps (@anthropic-ai/sdk, openai, @supabase/supabase-js, @clerk/nextjs,
ai, zod, pdf-parse, react-pdf) + shadcn init + core components +
.env.local template + folder skeleton. ✅ `pnpm dev` shows "LeaseLens dev".

**P1 · Law corpus (~1d)** — `scripts/scrape-laws.ts` (Knesset fetch +
`data/laws/*.txt` fallback), `lib/chunking/hebrew-law-chunker.ts` (split
by סעיף markers, handle sub-clauses), `scripts/embed-laws.ts` (idempotent
OpenAI embed → law_chunks). ✅ ~200 rows; query "החזר פיקדון" returns
sensible matches.

**P2 · Upload + parse (~1d)** — `/api/contracts/upload` (multipart PDF →
Storage → pdf-parse → contracts row → chunk 500tk/100 overlap → embed →
contract_chunks). `/upload` drag-and-drop UI + progress. ✅ Row + chunks
in Supabase, UI shows processed state.

**P3 · Analysis engine (~1.5d)** — `lib/ai/prompts/analyze-contract.ts`
(Hebrew system prompt, forbids hallucination, mandates citations).
`/api/contracts/[id]/analyze` streams: per chunk → match_law_chunks →
Claude with JSON schema `{summary, red_flags:[{severity, category,
contract_citation, law_reference, explanation}]}` → persist. ✅ Bad
clause returns high-severity flag with correct law reference.

**P4 · Viewer + red flags UI (~1d)** — `/contract/[id]` split layout:
react-pdf left with highlights, RedFlagCard list right (severity badge,
citations, "הראה במקור" scrolls PDF). Stream results as skeletons. ✅
Click flag → PDF scrolls + highlights source.

**P5 · RAG chat (~1d)** — `/api/contracts/[id]/chat` streaming: embed
question → match_contract_chunks(4) + match_law_chunks(2) → Claude with
context → structured citations JSON block. `ChatPanel` with streaming +
citation chips. ✅ "מה קורה אם אני עוזב אחרי חודשיים?" returns cited answer.

**P6 · Landing + polish (~0.5d)** — hero ("See what's really in your
lease."), how-it-works, demo GIF, empty/error/toast states, rate limit
(5 uploads/day), skeletons, SEO. ✅ No undefined surfaces.

**P7 · Deploy + metrics (~0.5d)** — Vercel deploy, custom domain,
/admin/metrics (count, avg time, avg flags, top laws), PostHog, killer
README with screenshots + arch diagram. ✅ Public URL works end-to-end.

## Principles
RTL-first · Streaming everywhere · Grounded citations only (Claude
answers "לא מצאתי מידע ודאי" if unsure) · Zod at all API boundaries ·
No dead code · Commit per acceptance.

## Constraints
Free tier only · Hebrew-first UI · Solo, 4 weeks.

## Start
Begin P0. Confirm Supabase project + target laws before proceeding.
When P0 done, stop and wait for "המשך".
