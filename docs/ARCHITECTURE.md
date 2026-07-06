# LeaseLens — Architecture

Status: Phase 1 deliverable (project-architect). Formalizes `MASTER_PROMPT.md` +
`docs/REQUIREMENTS.md` into an implementable blueprint. Complies exactly with
`docs/DECISIONS.md` (D1–D3), which overrides any conflicting detail here. Does not change
stack, DB schema, model choice, target laws, or phase order — those are locked upstream.

No application code is included in this document. Backend/frontend developers implement
against this blueprint; any deviation (schema, endpoint shape, RLS approach) must be flagged
back to project-architect, not made unilaterally (per `TEAM_PLAN.md`).

---

## 1. Stack Confirmation (locked — restated, not re-decided)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | Single repo, no separate backend service — API routes live in `app/api/**`. |
| Styling / UI | Tailwind CSS + shadcn/ui | RTL handled at the design layer (ux-ui-designer/visual-designer own tokens/layout). |
| AI orchestration | Vercel AI SDK (`ai` package) | Streaming primitive for both analysis (`streamObject`) and chat (`streamText`). |
| LLM (analysis + chat) | Claude `claude-sonnet-5` via Anthropic provider | One model for both P3 (analysis) and P5 (chat) — no other LLM introduced. |
| Embeddings | OpenAI `text-embedding-3-small` (1536-dim) | Used identically for law corpus (P1) and contract chunks (P2) and query-time embedding (P3/P5). |
| Database | Supabase Postgres + pgvector extension | Also hosts the two RPCs (`match_contract_chunks`, `match_law_chunks`). |
| File storage | Supabase Storage | Original uploaded PDFs, bucket `contracts`. |
| Auth | Clerk | Session/identity only; Supabase access is server-side via service role (see §4). |
| PDF ingestion | `pdf-parse` (server) | Text + page extraction at upload time. |
| PDF viewer | `react-pdf` (client) | Contract viewer with scroll-to-highlight. |
| Analytics | PostHog (P7) | Free tier, product analytics only, no PII forwarding of contract text. |
| Package manager / dev tooling | pnpm | Matches `pnpm create next-app` in P0. |
| Deploy | Vercel (app) + Supabase (DB/Storage), both free tier | Public URL, no paid infra tier. |

---

## 2. Folder Structure

```
leaselens/
  app/
    layout.tsx                        # root layout, ClerkProvider, RTL <html dir="rtl">
    page.tsx                          # landing page (P6)
    upload/
      page.tsx                        # drag-and-drop uploader (P2)
    contract/
      [id]/
        page.tsx                      # split viewer: react-pdf + RedFlagCard list (P4)
    admin/
      metrics/
        page.tsx                      # metrics dashboard (P7)
    api/
      contracts/
        upload/
          route.ts                    # POST — multipart PDF ingest (P2)
        [id]/
          analyze/
            route.ts                  # POST — streaming analysis (P3)
          chat/
            route.ts                  # POST — streaming RAG chat (P5)
      admin/
        metrics/
          route.ts                    # GET — aggregate metrics for /admin/metrics (P7)
      webhooks/
        clerk/
          route.ts                    # POST — Clerk user.created -> upsert profiles row
    globals.css
  components/
    ui/                               # shadcn/ui primitives (generated)
    ChatPanel.tsx                     # streaming chat + citation chips (P5)
    RedFlagCard.tsx                   # severity badge, citations, "הראה במקור" (P4)
    PdfViewer.tsx                     # react-pdf wrapper, scroll+highlight (P4)
    DisclaimerOnboardingGate.tsx       # D2 placement #1
    DisclaimerFooter.tsx              # D2 placement #2
    DisclaimerPreShareModal.tsx       # D2 placement #3
    UploadDropzone.tsx                # P2
  lib/
    ai/
      prompts/
        analyze-contract.ts           # Hebrew system prompt, JSON schema, anti-hallucination rules
        chat.ts                       # RAG chat system prompt, "לא מצאתי מידע ודאי" rule
      schemas.ts                      # Zod schemas for {summary, red_flags[...]} and chat citations
      validate-grounding.ts           # post-generation citation validation (see §8)
      anthropic-client.ts             # Anthropic provider wiring for AI SDK
    embeddings/
      openai-embed.ts                 # shared embedTexts() used by P1 + P2 + query-time embedding
    chunking/
      tokenize.ts                     # shared token counting (tiktoken/gpt-tokenizer)
      hebrew-law-chunker.ts           # P1 — splits data/laws/*.txt by סעיף markers
      contract-chunker.ts             # P2 — fixed-window 500tk/100 overlap over raw contract text
    supabase/
      admin-client.ts                 # service-role client (server-only, never imported client-side)
      queries/
        contracts.ts
        contract-chunks.ts
        red-flags.ts
        law-chunks.ts
    rate-limit.ts                     # 5 uploads/day check (see §8)
    zod-schemas/
      upload.ts
      analyze.ts
      chat.ts
      metrics.ts
    constants.ts                      # severity/category enums, RATE_LIMIT_UPLOADS_PER_DAY, etc.
  scripts/
    scrape-laws.ts                    # opportunistic Knesset fetch, gated by FEATURE_LAW_SCRAPING_ENABLED
    embed-laws.ts                     # idempotent: data/laws/*.txt -> law_chunks
  data/
    laws/
      rental-fair.txt
      tenant-protection.txt
      contracts-general.txt
      contracts-remedies.txt
  tests/
    fixtures/
      contracts/
        contract-illegal-01.pdf
        contract-illegal-01.json      # expected_findings ground truth
        contract-clean-02.pdf
        contract-clean-02.json
  supabase/
    migrations/
      0001_init.sql                   # tables, indexes, RPCs from §3
  docs/
    ARCHITECTURE.md                   # this file
    REQUIREMENTS.md
    TEAM_PLAN.md
    DECISIONS.md
    BRIEF.md
  middleware.ts                       # Clerk route protection (upload, contract/*, admin/*)
  .env.local / .env.example
  package.json
```

**Ownership boundary (per `TEAM_PLAN.md`, restated for clarity):**
`backend-developer` owns everything under `app/api/**`, `lib/ai`, `lib/chunking`,
`lib/embeddings`, `lib/supabase`, `lib/rate-limit.ts`, `scripts/**`, `supabase/migrations/**`.
`frontend-developer` owns `app/page.tsx`, `app/upload/page.tsx`, `app/contract/[id]/page.tsx`,
`app/admin/metrics/page.tsx`, everything in `components/` (consuming, not defining, the data
shapes backend produces), and `middleware.ts` route-matcher additions only in coordination with
backend. Neither owns `lib/zod-schemas/**` unilaterally — schemas are the contract between them;
changes require both to update in the same PR.

---

## 3. Data Model (migration-ready SQL DDL)

File: `supabase/migrations/0001_init.sql`. Formalizes the schema already named in
`MASTER_PROMPT.md` — no new business fields invented. A small number of enum value-sets and
housekeeping columns (`created_at`, PK defaults) that `MASTER_PROMPT.md` left unspecified are
filled in below and called out explicitly.

```sql
-- Extensions
create extension if not exists vector;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ============================================================
-- profiles — mirrors Clerk user identities
-- ============================================================
create table profiles (
  id          text primary key,            -- Clerk user id (e.g. "user_2abc...")
  email       text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- contracts
-- ============================================================
-- analysis_status enum values are an architecture decision (not specified upstream):
-- 'pending'    — row created, chunking/embedding in progress
-- 'processing' — analysis (P3) running/streaming
-- 'completed'  — summary + red_flags persisted
-- 'failed'     — parse or analysis error, surfaced to user
create table contracts (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null references profiles(id) on delete cascade,
  file_name        text not null,
  storage_path     text not null,          -- Supabase Storage path: {user_id}/{id}/{file_name}
  raw_text         text,                   -- full pdf-parse output
  summary          text,                   -- Hebrew summary, written by P3
  analysis_status  text not null default 'pending'
                     check (analysis_status in ('pending','processing','completed','failed')),
  created_at       timestamptz not null default now()
);

create index contracts_user_id_idx on contracts(user_id);
create index contracts_created_at_idx on contracts(created_at);
create index contracts_status_idx on contracts(analysis_status);

-- ============================================================
-- contract_chunks
-- ============================================================
create table contract_chunks (
  id            uuid primary key default gen_random_uuid(),
  contract_id   uuid not null references contracts(id) on delete cascade,
  chunk_index   int not null,
  text          text not null,
  embedding     vector(1536) not null,     -- text-embedding-3-small
  page_number   int,
  created_at    timestamptz not null default now(),
  unique (contract_id, chunk_index)
);

create index contract_chunks_contract_id_idx on contract_chunks(contract_id);

-- HNSW chosen over IVFFlat: no pre-training-set requirement, works well as contracts are
-- inserted incrementally per-user (IVFFlat's cluster quality depends on data present at
-- CREATE INDEX time, which is a poor fit here). Requires pgvector >= 0.5.0 (Supabase managed
-- Postgres ships this by default as of 2024+; verify on project provisioning).
create index contract_chunks_embedding_idx
  on contract_chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ============================================================
-- red_flags
-- ============================================================
create table red_flags (
  id                uuid primary key default gen_random_uuid(),
  contract_id       uuid not null references contracts(id) on delete cascade,
  severity          text not null check (severity in ('high','medium','low')),
  category          text not null check (category in ('illegal','unfair','ambiguous')),
  contract_citation text not null,   -- verbatim excerpt from the contract
  law_citation      text not null,   -- human-readable law reference, e.g. 'חוק הגנת הדייר, סעיף 12'
  law_reference      text not null,  -- machine reference: matches law_chunks (law_name, section_number)
  explanation       text not null,   -- Hebrew plain-language explanation
  created_at        timestamptz not null default now()
);

create index red_flags_contract_id_idx on red_flags(contract_id);

-- ============================================================
-- law_chunks
-- ============================================================
create table law_chunks (
  id             uuid primary key default gen_random_uuid(),
  law_name       text not null,        -- e.g. 'חוק הגנת הדייר [נוסח משולב], התשל"ב-1972'
  law_year       int not null,
  section_number text not null,        -- text, not int: supports '9א', '12(ב)' style numbering
  section_title  text,
  category       text not null,        -- see §5 mapping from data/laws/*.txt source file
  is_binding     boolean not null default true,
  text           text not null,
  embedding      vector(1536) not null,
  created_at     timestamptz not null default now(),
  unique (law_name, section_number)    -- required for idempotent embed-laws upsert (see §5)
);

create index law_chunks_embedding_idx
  on law_chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ============================================================
-- Row-Level Security — defense in depth (see §4 for the enforcement model)
-- ============================================================
alter table profiles enable row level security;
alter table contracts enable row level security;
alter table contract_chunks enable row level security;
alter table red_flags enable row level security;
alter table law_chunks enable row level security;
-- Deliberately NO permissive policies are created for anon/authenticated roles.
-- The service role bypasses RLS entirely (Postgres/Supabase default), which is the only role
-- ever used by this app's server-side code. If the anon/publishable key is ever used directly
-- (it should not be), RLS defaults to deny-all here, failing closed rather than open.

-- ============================================================
-- RPC: match_contract_chunks
-- ============================================================
create or replace function match_contract_chunks(
  p_contract_id   uuid,
  p_query_embedding vector(1536),
  p_match_count   int default 4
)
returns table (
  id           uuid,
  contract_id  uuid,
  chunk_index  int,
  text         text,
  page_number  int,
  similarity   float
)
language sql stable
as $$
  select
    cc.id, cc.contract_id, cc.chunk_index, cc.text, cc.page_number,
    1 - (cc.embedding <=> p_query_embedding) as similarity
  from contract_chunks cc
  where cc.contract_id = p_contract_id
  order by cc.embedding <=> p_query_embedding
  limit p_match_count;
$$;

-- ============================================================
-- RPC: match_law_chunks
-- ============================================================
create or replace function match_law_chunks(
  p_query_embedding vector(1536),
  p_match_count     int default 2
)
returns table (
  id             uuid,
  law_name       text,
  law_year       int,
  section_number text,
  section_title  text,
  category       text,
  is_binding     boolean,
  text           text,
  similarity     float
)
language sql stable
as $$
  select
    lc.id, lc.law_name, lc.law_year, lc.section_number, lc.section_title,
    lc.category, lc.is_binding, lc.text,
    1 - (lc.embedding <=> p_query_embedding) as similarity
  from law_chunks lc
  order by lc.embedding <=> p_query_embedding
  limit p_match_count;
$$;
```

**Note on `law_citation` vs `law_reference`** (both named explicitly in `MASTER_PROMPT.md`):
`law_citation` is the human-readable string shown in the UI (`RedFlagCard`); `law_reference` is
the machine-resolvable key (`law_name` + `section_number`) the backend uses to re-fetch the exact
`law_chunks` row for the "show source law" affordance and for grounding validation (§8). Backend
must populate both from the same retrieved `law_chunks` row — never invent one without the other.

---

## 4. Auth Model — Clerk to Supabase

**Decision: application-layer row scoping via Supabase service role, not Clerk-JWT-as-Supabase-JWT.**

- There is no client-side Supabase access anywhere in this app. All Supabase reads/writes happen
  inside Next.js API routes (`app/api/**`) or server components, using a single server-only
  Supabase client constructed with the **service role key** (`lib/supabase/admin-client.ts`,
  never imported into any `"use client"` file, never exposed via `NEXT_PUBLIC_*`).
- Every API route first resolves the caller's identity via Clerk's server-side `auth()` helper
  (from `middleware.ts` / route handler), obtaining `userId`. Every subsequent Supabase query
  **must** filter explicitly by `user_id = userId` (contracts) or via a join/subquery through
  `contracts.user_id` (contract_chunks, red_flags). This is manual, explicit, and reviewable —
  not implicit through RLS.
- `profiles` is populated via a Clerk webhook: `app/api/webhooks/clerk/route.ts` listens for
  `user.created` (and `user.updated` for email changes) and upserts `{id: clerkUserId, email}`.
  This keeps `profiles.id` mirroring Clerk IDs as required, without requiring the client to ever
  call Supabase directly.
- `middleware.ts` uses Clerk's route matcher to require sign-in for `/upload`, `/contract/:id*`,
  and `/admin/metrics`. The landing page (`/`) remains public.
- **Why not native Clerk↔Supabase JWT/RLS integration:** wiring Clerk's JWT as a Supabase-trusted
  third-party token (so Postgres RLS policies key off `auth.jwt()->>'sub'`) adds real
  configuration surface (JWKS trust, Supabase third-party auth setup) for no functional gain here,
  since **no client ever talks to Supabase directly** in this architecture — every access path is
  already server-mediated and already Clerk-authenticated before it reaches Supabase. RLS is kept
  enabled with a deny-all default (§3) purely as a fail-closed safety net, not as the primary
  enforcement mechanism.
- **This is a security-relevant decision that was not explicitly locked upstream — flagged to
  owner in the closing summary of this document.**

---

## 5. Law-Corpus Pipeline (P1) — per D1

- **Source of truth:** `data/laws/*.txt`, hand-prepared by the owner per D1. The four files
  (`rental-fair.txt`, `tenant-protection.txt`, `contracts-general.txt`, `contracts-remedies.txt`)
  are the only P1 corpus; **`embed-laws.ts` never proceeds past a missing-file check — P1 is not
  "done" until real files exist in the repo (owner-verified, not placeholder text).**
- **File format (fixed, per D1):** line 1 = law title (`<כותרת החוק>`); every subsequent
  non-blank line begins a new "section block" of the form `<מספר סעיף> <טקסט הסעיף>`, where
  `מספר סעיף` may include Hebrew letter suffixes (e.g. `9א`) or parenthetical sub-numbers
  (e.g. `12(ב)`). Lines that do not start with a recognizable section-number token are treated
  as **continuation lines of the current section** (sub-clause wrapping), not new sections.
- **`hebrew-law-chunker.ts` parsing strategy:**
  1. Read file, split into lines, strip BOM/trailing whitespace.
  2. First non-blank line -> `law_name` (and `law_year` parsed via regex extracting the
     `תש..-YYYY` / `-19NN`/`-20NN` pattern from the title).
  3. For each subsequent line, test against a section-start regex: a leading token matching
     `^\d+[א-ת]?(\([א-ת0-9]+\))?\.?\s` (digit, optional Hebrew letter suffix, optional
     parenthetical sub-marker, optional period, then whitespace). If matched: close the previous
     section accumulator (if any) and open a new one with `section_number` = the matched token
     and `section_title` = null (these source files are body text, not titled sections) and
     `text` = remainder of the line.
  4. If a line does **not** match the section-start regex, append it (with a newline) to the
     currently-open section's `text` — this is the sub-clause handling requirement from
     `MASTER_PROMPT.md`: sub-clauses stay inside their parent סעיף's `text`, they are not split
     into separate `law_chunks` rows.
  5. On EOF, flush the last open section.
  6. `category` and `is_binding` are **not present in the .txt format** and must be derived from
     which source file produced the chunk — fixed mapping (architecture decision, since D1 does
     not specify this):

     | File | `category` | `is_binding` |
     |---|---|---|
     | `rental-fair.txt` | `fair_rental` | `true` |
     | `tenant-protection.txt` | `tenant_protection` | `true` |
     | `contracts-general.txt` | `contracts_general` | `true` |
     | `contracts-remedies.txt` | `contracts_remedies` | `true` |

     All four are enacted, in-force statutes, so `is_binding = true` for every row in P1 — the
     column exists in the schema for future non-binding material (e.g. draft bills, commentary)
     which is explicitly out of scope now.
- **`embed-laws.ts` idempotent flow:**
  1. For each of the 4 files: parse via `hebrew-law-chunker.ts` into `{law_name, law_year,
     section_number, section_title, category, is_binding, text}[]`.
  2. Batch-embed all `text` values via `lib/embeddings/openai-embed.ts` (`text-embedding-3-small`).
  3. `INSERT ... ON CONFLICT (law_name, section_number) DO UPDATE SET section_title = excluded.*,
     category = excluded.category, is_binding = excluded.is_binding, text = excluded.text,
     embedding = excluded.embedding` — reruns update in place rather than duplicating rows. This
     is the mechanism that satisfies "idempotent" in `MASTER_PROMPT.md`/REQUIREMENTS #6.
  4. Log a per-file row count summary; acceptance target ~200 total rows across all 4 files.
- **Live scraping — feature flag (future, NOT part of P1 completion):**
  - Flag name: **`FEATURE_LAW_SCRAPING_ENABLED`**, an environment variable (`.env.local` /
    Vercel project env), default unset/`false`.
  - Lives in `scripts/scrape-laws.ts` only. When `false` (default), the script is a no-op / exits
    immediately with a message pointing to the `data/laws/*.txt` fallback. When `true`, it
    attempts a best-effort fetch from `main.knesset.gov.il` and, if successful, **overwrites the
    corresponding `data/laws/*.txt` file** (never writes directly to `law_chunks`) — the
    human-editable `.txt` files remain the single source of truth that `embed-laws.ts` reads,
    per D1. `embed-laws.ts` itself never checks this flag and never calls the network.
  - P1's acceptance check (✅ ~200 rows, "החזר פיקדון" returns sensible matches) is evaluated
    purely against the `.txt`-driven `embed-laws.ts` path; scraping is explicitly out of the
    P1 done-definition (D1, restated here for the builder agents).

---

## 6. Analysis + Chat Data Flow

All AI output streams via the Vercel AI SDK; no blocking request/response for AI-generated
content anywhere in P3/P5.

### 6.1 Analysis (`/api/contracts/[id]/analyze`, P3)

```
Client (POST, no body needed beyond :id)
  -> route handler:
     1. auth() -> userId; verify contracts.user_id = userId (404 if not owner/not found)
     2. set contracts.analysis_status = 'processing'
     3. load contract_chunks for this contract_id (ordered by chunk_index)
     4. FOR EACH chunk:
          a. embed chunk.text is already stored (P2) -> use its existing embedding
          b. call match_law_chunks(chunk.embedding, count=~5) -> candidate law chunks
          c. call Claude (streamObject, schema = AnalysisChunkResult) with:
             - system prompt (lib/ai/prompts/analyze-contract.ts): Hebrew, forbids
               hallucination, mandates a contract_citation verbatim substring of chunk.text
               and a law_reference that must be one of the retrieved law chunk ids
             - user content: chunk.text + retrieved law chunk texts (with their
               law_name/section_number so Claude can cite precisely)
          d. stream partial {summary_fragment?, red_flags?[]} to client as they arrive
          e. run lib/ai/validate-grounding.ts on each candidate red_flag before it is
             either streamed further or persisted (see §8) — drop ungrounded flags
     5. aggregate a final Hebrew `summary` (single Claude call over all per-chunk summaries,
        or a running-summary approach — backend-developer's implementation choice, contract
        is only the final persisted `contracts.summary` string)
     6. persist: contracts.summary + analysis_status='completed'; INSERT each validated
        red_flag row into red_flags
     7. on any failure: analysis_status='failed', stream a structured error event
```

### 6.2 Chat (`/api/contracts/[id]/chat`, P5)

```
Client (POST { question: string })
  -> route handler:
     1. auth() -> userId; verify ownership of :id
     2. Zod-validate { question } (non-empty, max length)
     3. embed(question) via lib/embeddings/openai-embed.ts
     4. match_contract_chunks(contract_id, embedding, count=4)
        match_law_chunks(embedding, count=2)
     5. Claude (streamText) with:
          - system prompt (lib/ai/prompts/chat.ts): Hebrew, must answer ONLY from the
            provided contract/law excerpts; if retrieved similarity is below threshold or
            content doesn't address the question, respond exactly with
            "לא מצאתי מידע ודאי"
          - context: the 4 contract chunks + 2 law chunks, each tagged with an id the model
            must reference in its structured citations block
       -> stream tokens to client as they generate
     6. After streaming completes, emit a trailing structured citations JSON block
        { contract_chunk_ids: [...], law_chunk_ids: [...] } — validated by
        lib/ai/validate-grounding.ts against what was actually retrieved in step 4
        (Claude cannot cite a chunk id that wasn't sent to it)
```

---

## 7. Planned API Endpoints

Every route below validates request and response with Zod (`lib/zod-schemas/**`); invalid input
returns a structured `{ error: string, issues?: ZodIssue[] }` with a 4xx status, never a silent
500. Full request/response shape definitions are the backend developer's implementation detail —
this list is the checklist of every route that must exist.

```
POST   /api/contracts/upload            — Multipart PDF upload: Storage write, pdf-parse,
                                           contracts row, chunk+embed -> contract_chunks.
                                           Enforces 5-uploads/day rate limit (see §8) before
                                           accepting the file.
POST   /api/contracts/[id]/analyze      — Streaming: per-chunk law retrieval + Claude ->
                                           {summary, red_flags[]}, persisted (P3).
POST   /api/contracts/[id]/chat         — Streaming RAG chat: embed question, retrieve
                                           contract+law chunks, Claude answer + citations (P5).
GET    /api/admin/metrics               — Aggregate: contract count, avg analysis time,
                                           avg red flags/contract, top-cited laws (P7).
POST   /api/webhooks/clerk              — Clerk `user.created`/`user.updated` webhook ->
                                           upsert profiles row. Verified via Clerk webhook
                                           signing secret, not user-session authenticated.
```

No standalone rate-limit endpoint exists — the check lives inline in the upload route (§8).

---

## 8. Non-Functional Requirements — Architectural Enforcement Points

**Auth strategy:** Clerk session on every non-public route (`middleware.ts` matcher); Supabase
accessed exclusively via service role from trusted server code; row ownership enforced by
explicit `user_id` filtering in every query (§4). No RLS-based enforcement is relied upon as the
primary control.

**Error handling pattern:** every API route returns a consistent envelope on failure —
`{ error: string, code?: string }` with an appropriate HTTP status (400 validation, 401
unauthenticated, 403 not-owner, 404 not-found, 429 rate-limited, 500 unexpected). Streaming
routes emit a terminal structured error event on the stream itself if failure occurs mid-stream,
so the client never hangs on a dropped connection.

**Validation approach:** Zod schemas in `lib/zod-schemas/**`, one file per route, imported by
both the route handler (request parsing) and used to describe the response shape consumed by
frontend. `lib/ai/schemas.ts` additionally defines the Zod schema Claude's structured output
(`streamObject`) is constrained to for analysis.

**Logging:** server-side only (Vercel function logs); contract `raw_text`/chunk text/PII is
never sent to PostHog or any third-party analytics event — only route name, duration, and
coarse outcome (success/fail/rate-limited) are logged as metrics-relevant events.

**Environment variables required** (`.env.example`):
```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
FEATURE_LAW_SCRAPING_ENABLED=false
RATE_LIMIT_UPLOADS_PER_DAY=5
```

**CORS policy:** no cross-origin API consumption is in scope (single Next.js app serving its
own frontend); API routes do not set permissive CORS headers. `/api/webhooks/clerk` is the only
route reachable from outside the app's own origin, and it authenticates via webhook signature,
not CORS.

**Rate limiting (5 uploads/day) — where it lives:** `lib/rate-limit.ts`, called at the top of
`/api/contracts/upload` before any Storage write. Implementation: `SELECT count(*) FROM
contracts WHERE user_id = :userId AND created_at >= now() - interval '24 hours'`; if
`>= RATE_LIMIT_UPLOADS_PER_DAY`, return 429 with a Hebrew-ready error code before touching
Storage/OpenAI/Anthropic (cost protection is the point — reject before any paid API call). This
reuses the existing `contracts.created_at` column rather than introducing a new table.

**Disclaimer components (D2, architectural placement):**
1. `components/DisclaimerOnboardingGate.tsx` — rendered client-side on first entry to the app;
   gates nothing server-side (no DB field added for "acknowledged" state — persisted via
   `localStorage` key `leaselens_disclaimer_ack_v1`, a deliberate minimal-footprint choice since
   this is a UI acknowledgment, not a security control). Must show the exact D2 wording with an
   "הבנתי" checkbox before the checkbox can be dismissed.
2. `components/DisclaimerFooter.tsx` — fixed footer, mounted in `app/contract/[id]/page.tsx`
   layout (every contract-analysis result screen), exact D2 wording, always visible.
3. `components/DisclaimerPreShareModal.tsx` — **architectural note:** no export/share feature is
   otherwise defined in P0–P7. To give this mandatory placement a real trigger without inventing
   an out-of-scope feature, `/contract/[id]` gets one small "שתף / הדפס" button whose only
   behavior is: open this modal (D2 wording) -> on confirm, call `window.print()`. This is the
   minimum surface needed to satisfy D2's third placement. **Flagged to owner below** since it's
   a small addition not explicitly named in `MASTER_PROMPT.md`'s phase list.

**Grounded-citations-only enforcement point:** `lib/ai/validate-grounding.ts`, called after every
Claude structured-output result (analysis) and after every chat citation block, in both
`/api/contracts/[id]/analyze` and `/api/contracts/[id]/chat`. It mechanically re-checks: (a) for
analysis, `red_flag.contract_citation` must be a substring (fuzzy/normalized-whitespace match) of
the source chunk's `text`, and `law_reference` must resolve to one of the `law_chunks` rows that
was actually retrieved for that chunk; (b) for chat, every cited `contract_chunk_id`/
`law_chunk_id` must be a member of the set retrieved in that request. Anything failing validation
is dropped (analysis: the red flag is discarded, not shown) or replaced with the literal fallback
string `"לא מצאתי מידע ודאי"` (chat) — never surfaced as-is to the user. This is the concrete
mechanism behind the "grounded citations only" principle, not just a prompt instruction.

**Free-tier constraints:** Vercel Hobby function duration limits apply to `analyze`/`chat`
routes — both must set `export const maxDuration` appropriately and rely on streaming (which
sends bytes incrementally so the client sees progress well before any hard timeout). **Verify the
current Vercel Hobby max duration figure at P7 deploy time** — this document does not assert a
specific number since Vercel's free-tier limits have changed over time; if the 60s product-flow
target can't fit inside the current Hobby cap, the fallback is to keep per-request work small
(one contract chunk's worth of analysis per Claude call, already the design in §6.1) so no single
function invocation needs the full 60s budget, only the overall streamed UX does.

---

## 9. Feature List (updated from REQUIREMENTS.md, phase-aligned, atomic/testable)

Numbering matches `docs/REQUIREMENTS.md` §4 for traceability; this is the architecture-level
restatement, not a re-derivation.

**P0 — Bootstrap**
1. Next.js 15 App Router + TS project runs (`pnpm dev` shows "LeaseLens dev").
2. All locked dependencies installed; `.env.local` template present with no real secrets committed.
3. Folder skeleton matches §2 of this document.

**P1 — Law corpus**
4. `data/laws/*.txt` (4 files, D1 format) exist with real legal text, not placeholders.
5. `hebrew-law-chunker.ts` correctly splits each file into section rows, sub-clauses folded in.
6. `embed-laws.ts` populates `law_chunks` (~200 rows), idempotent on rerun (no duplicates).
7. `match_law_chunks("החזר פיקדון")` returns on-topic rows.

**P2 — Upload + parse**
8. User uploads a PDF at `/upload` (drag-drop or picker).
9. Non-PDF upload rejected with a Hebrew error, before Storage write.
10. Valid PDF: stored, parsed (pdf-parse), `contracts` row created, chunked (500tk/100 overlap),
    embedded, persisted to `contract_chunks` with page numbers.
11. UI reflects processing -> processed state once chunks exist.

**P3 — Analysis engine**
12. `/api/contracts/[id]/analyze` streams `{summary, red_flags[]}` per §6.1.
13. Every red_flag passes `validate-grounding.ts` before persistence/display.
14. A known-bad clause (per D3 fixture `contract-illegal-01.pdf`) yields a high-severity flag
    citing the correct law section for each of its 3 documented illegal clauses.
15. `contracts.summary` and `red_flags` rows persisted with valid severity/category enums.

**P4 — Viewer + red flags UI**
16. `/contract/[id]` renders PDF + RedFlagCard list in an RTL-correct split layout.
17. Each RedFlagCard shows severity badge, contract citation, law citation, explanation.
18. "הראה במקור" scrolls/highlights the correct PDF location (verified for >=3 flags, per QA).
19. Results render progressively (skeletons) as the stream arrives.

**P5 — RAG chat**
20. `ChatPanel` accepts free-text Hebrew questions.
21. Chat retrieves `match_contract_chunks(4)` + `match_law_chunks(2)` and answers grounded in both.
22. Citations rendered as chips, each resolvable back to a real chunk.
23. Out-of-scope/unanswerable questions yield exactly `"לא מצאתי מידע ודאי"`.

**P6 — Landing + polish**
24. Landing page: hero, how-it-works, demo, `DisclaimerOnboardingGate`.
25. Empty/loading/error states across upload/analysis/chat — no undefined/blank screens.
26. 5 uploads/day enforced (§8), with a clear Hebrew rate-limit message on the 6th attempt.
27. Basic SEO metadata on landing page.

**P7 — Deploy + metrics**
28. Public Vercel URL, Supabase-backed, works end-to-end for a first-time visitor.
29. `/admin/metrics`: contract count, avg analysis time, avg red flags/contract, top-cited laws.
30. PostHog integrated (coarse events only, no contract content).
31. README with screenshots + architecture diagram (docs-writer, downstream of this document).

**Cross-cutting**
32. Sign-up/sign-in via Clerk gates `/upload`, `/contract/*`, `/admin/metrics`.
33. Every API route validates input/output via Zod.
34. Disclaimer (D2 exact wording) present at all 3 mandated placements (§8).

---

## 10. Out of Scope (unchanged from REQUIREMENTS.md — restated for this document's audience)

- Any law beyond the 4 D1 corpus files.
- Live Knesset scraping as a P1 requirement (feature-flagged, best-effort only, §5).
- Contract generation/editing — analysis only.
- English/Arabic UI, i18n framework.
- Payments, billing, teams, multi-tenant roles.
- Native mobile apps.
- OCR for image-only PDFs.
- Full WCAG certification.
- Real-time multi-user collaboration on a contract.
- Historical law-version tracking.
- A general export/share feature beyond the minimal print-triggered `DisclaimerPreShareModal`
  described in §8 (no PDF export, no shareable public links, no email-a-copy).
- Native Clerk-JWT-as-Supabase-JWT / RLS-driven authorization (deliberately not used, §4).

---

## Open Questions / Decisions Flagged to Owner

1. **Clerk <-> Supabase authorization model (§4).** Chose service-role + explicit application-
   layer `user_id` filtering over wiring Clerk JWTs into Supabase RLS. This is lower-friction and
   sufficient given no client-side Supabase access exists anywhere in the app, but it is a
   security-relevant choice `MASTER_PROMPT.md`/`DECISIONS.md` didn't make explicitly. **Needs
   owner sign-off before backend work starts on P2.**
2. **D2's "pre-export/share modal" placement has no natural feature to attach to** (no export/
   share feature exists in P0–P7). Resolved by adding one small print-triggering button on
   `/contract/[id]` solely to host this modal (§8). **Flagging as a minor, in-spirit addition**
   (not a new feature area) — owner should confirm this reading of D2 is acceptable, or specify
   a preferred trigger.
3. **`category`/`is_binding` derivation for law_chunks (§5)** is inferred per-source-file since
   the D1 `.txt` format carries no such markers. All 4 files are enacted binding statutes, so
   `is_binding = true` uniformly for P1; `category` uses a fixed file->category map. Low-risk,
   but flagged since it's new logic not explicit in D1.
4. **Vercel Hobby function-duration limits vs. the ~60s analysis target (§8)** — architecture
   mitigates via per-chunk streaming rather than one long call, but the exact current free-tier
   duration cap should be verified against Vercel's live docs at P7, not assumed from this
   document.
