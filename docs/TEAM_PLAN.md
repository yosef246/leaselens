# LeaseLens — Team Plan

> ⚠️ **Planning doc (original spec).** The build diverged from this plan — see
> **`docs/IMPLEMENTATION.md`** for the authoritative as-built record (Supabase Auth not Clerk;
> endpoints `ask`/`review`/`rewrite`).

Derived from `docs/REQUIREMENTS.md` and `MASTER_PROMPT.md`. Pipeline order follows the P0–P7
build order already locked in MASTER_PROMPT; this document assigns WHO does WHAT, not HOW.
Architecture, schema, tech choices, and phase order are NOT re-decided here.

Architectural note carried into every relevant section: this is a **Next.js 15 App Router**
project — there is no separate backend/frontend service split. `backend-developer` owns
server-side logic that happens to live inside the same repo (`app/api/**`, `lib/ai`,
`lib/chunking`, `lib/supabase`, `lib/embeddings`, `scripts/scrape-laws.ts`,
`scripts/embed-laws.ts`, DB schema/RPCs, `API_CONTRACT.md`). `frontend-developer` owns
everything rendered to the user (`app/` pages/layouts, `components/`, the react-pdf viewer,
`ChatPanel`, styling/composition of designs). Both work against the same repo across P2–P6.

---

## project-architect — Phase 1
**Mission for this project:** Turn the locked stack + DB schema + P0–P7 phase list into a
concrete repo structure, API contract, and RPC/migration plan that backend and frontend can
build against without renegotiating decisions.
**Must deliver:**
- `ARCHITECTURE.md` — folder structure (`app/`, `lib/`, `components/`, `scripts/`, `data/laws/`),
  request/response flow diagrams for upload→analyze and chat.
- `API_CONTRACT.md` — every route (`/api/contracts/upload`, `/api/contracts/[id]/analyze`,
  `/api/contracts/[id]/chat`) with Zod input/output schemas.
- Supabase migration plan/SQL for the 4 tables + 2 RPCs already specified in MASTER_PROMPT
  (`profiles`, `contracts`, `contract_chunks`, `red_flags`, `law_chunks`,
  `match_contract_chunks`, `match_law_chunks`).
- Decision record for chunking/embedding pipeline shape (how P1 law-embedding and P2
  contract-embedding scripts share code).
**Must focus on:**
- Formalizing the exact schema/RPC signatures already given in MASTER_PROMPT — not inventing new fields.
- A P0 bootstrap plan that is fast and unblocks everyone else same-day.
- Clear ownership boundary lines between `backend-developer` and `frontend-developer` so they
  don't collide on the same files.
- Rate-limiting and free-tier cost-control mechanics (where the 5 uploads/day check lives).
**Must NOT do:**
- Choose a different DB, auth provider, or LLM/embedding model than what's locked.
- Design visual UI/UX — that's ux-ui-designer and visual-designer.
**Depends on:** `docs/REQUIREMENTS.md`, `MASTER_PROMPT.md`.

---

## ux-ui-designer — Phase 2
**Mission for this project:** Design the Hebrew-RTL information architecture and interaction
flows for upload, split contract/red-flag viewer, and chat, so a first-time Hebrew-speaking
renter understands what to do and what she's looking at within seconds.
**Must deliver:**
- User flows for: sign-up/sign-in → upload → processing state → contract viewer → chat.
- Wireframes (low/mid-fidelity) for `/`, `/upload`, `/contract/[id]` (RTL split layout: PDF +
  red flag list), `ChatPanel` (streaming + citation chips), empty/error/loading states,
  `/admin/metrics`.
- RedFlagCard interaction spec: severity badge, citations, "הראה במקור" click → scroll+highlight
  behavior in the PDF.
- Legal disclaimer placement spec (landing page + contract view), per Open Question #2 in
  REQUIREMENTS.md.
**Must focus on:**
- RTL-native layout (not an LTR design mirrored late) — reading order, icon direction, panel
  order (PDF right, red flags left, per Hebrew reading convention, or as decided and documented).
- Making the 60-second wait feel fast: streaming/skeleton states for summary and red flags.
- Trust and clarity for legal content — severity and citation must be scannable at a glance.
- Rate-limit and error messaging in Hebrew (upload rejected, non-PDF, 5/day limit hit).
**Must NOT do:**
- Pick final colors/typography/spacing tokens — that is visual-designer's job.
- Specify component code or React structure — that is frontend-developer's job.
**Depends on:** `docs/REQUIREMENTS.md`, `ARCHITECTURE.md`.

---

## visual-designer — Phase 3
**Mission for this project:** Apply a clean, trustworthy visual identity on top of shadcn/ui that
reads as a serious legal/analysis tool (not a toy), fully in Hebrew RTL.
**Must deliver:**
- `DESIGN_SYSTEM.md` / Tailwind theme tokens: color palette (including severity colors for
  high/medium/low that meet contrast requirements), typography (Hebrew-supporting font stack),
  spacing scale, shadcn/ui theme overrides.
- Visual specs for RedFlagCard severity badges, citation chips, PDF highlight overlay color,
  landing page hero treatment.
- Iconography/logo treatment (lightweight — portfolio project, not a full brand system).
**Must focus on:**
- Severity color-coding that's distinguishable and accessible (high/medium/low at a glance).
- A Hebrew webfont that renders cleanly at body-copy sizes for dense legal text.
- Landing page visual polish (P6) since this doubles as the portfolio "first impression."
- Consistency between the PDF-viewer highlight color and the RedFlagCard severity color.
**Must NOT do:**
- Redefine layout/IA already decided by ux-ui-designer.
- Introduce a design system heavier than the project needs (no full multi-brand token system).
**Depends on:** `docs/REQUIREMENTS.md`, ux-ui-designer wireframes.

*(Not marked SKIP: shadcn/ui out of the box plus Hebrew RTL and severity-color legibility genuinely
need explicit visual decisions, not just default theme.)*

---

## backend-developer — Phase 4
**Mission for this project:** Implement every server-side piece that makes the product's AI
claims real and grounded — law corpus, upload/parse/embed pipeline, analysis engine, and RAG
chat — as Next.js API routes and lib code in the same app.
**Must deliver:**
- `scripts/scrape-laws.ts`, `data/laws/*.txt` fallback content, `lib/chunking/hebrew-law-chunker.ts`,
  `scripts/embed-laws.ts` (P1).
- `app/api/contracts/upload/route.ts`, Storage + pdf-parse + chunking + embedding pipeline into
  `contract_chunks` (P2).
- `app/api/contracts/[id]/analyze/route.ts`, `lib/ai/prompts/analyze-contract.ts`, streaming
  Claude call producing `{summary, red_flags[...]}`, persistence to `contracts`/`red_flags` (P3).
- `app/api/contracts/[id]/chat/route.ts`, RAG retrieval (`match_contract_chunks` +
  `match_law_chunks`) + streaming Claude chat with citations JSON (P5).
- Rate-limit middleware (5 uploads/day), `/admin/metrics` data endpoint (P7).
- Zod schemas for every API route input/output.
**Must focus on:**
- Grounded-citations-only prompting: every red flag/chat answer must trace to a retrieved chunk;
  implement the "לא מצאתי מידע ודאי" fallback explicitly.
- Idempotent, re-runnable embedding scripts (both law and contract).
- Streaming responses (Vercel AI SDK) end-to-end, not buffered JSON.
- Correct RLS/row-scoping by Clerk user ID on every query.
**Must NOT do:**
- Build any UI component or page layout — hand off data/streaming contracts to frontend-developer.
- Add laws beyond the 3 named statutes or features beyond P0–P7 scope.
**Depends on:** `ARCHITECTURE.md`, `API_CONTRACT.md`, `docs/REQUIREMENTS.md`.

---

## frontend-developer — Phase 5
**Mission for this project:** Build every user-facing page and streaming UI so the product flow
(upload → summary/red-flags → chat) feels fast, trustworthy, and fully Hebrew-RTL.
**Must deliver:**
- `app/page.tsx` landing (hero, how-it-works, demo, disclaimer) (P6).
- `app/upload/page.tsx` drag-and-drop uploader with progress state (P2).
- `app/contract/[id]/page.tsx` split layout: react-pdf viewer + `RedFlagCard` list, streaming
  skeletons, "הראה במקור" scroll+highlight behavior (P4).
- `components/ChatPanel.tsx` with streaming responses and citation chips (P5).
- Empty/error/loading states and toasts across upload, analysis, chat (P6).
- `app/admin/metrics/page.tsx` rendering backend-provided metrics (P7).
**Must focus on:**
- Wiring to backend's streaming endpoints correctly (progressive rendering, not spinner-then-dump).
- RTL correctness in every layout per ux-ui-designer's flows and visual-designer's tokens.
- Click-to-scroll-and-highlight interaction between RedFlagCard and the PDF viewer.
- Clerk-gated routes (upload/contract pages require sign-in).
**Must NOT do:**
- Implement or modify API routes, prompts, or DB queries — consume the contracts backend-developer defines.
- Invent new pages/features not in the wireframes or MASTER_PROMPT phases.
**Depends on:** `ARCHITECTURE.md`, `API_CONTRACT.md`, ux-ui-designer wireframes,
visual-designer tokens, backend-developer's route contracts.

---

## qa-tester — Phase 6
**Mission for this project:** Verify every P0–P7 acceptance check in MASTER_PROMPT actually
holds, with special scrutiny on grounded-citation correctness since wrong legal claims are the
project's single biggest credibility risk.
**Must deliver:**
- Test plan mapped 1:1 to each phase's ✅ acceptance check and to Success Criteria 1–7 in
  `docs/REQUIREMENTS.md`.
- 1–2 seeded sample lease PDFs with intentionally illegal/unfair clauses (Open Question #3) used
  as fixtures for red-flag accuracy testing.
- Bug/issue log (severity-tagged) covering: upload edge cases (non-PDF, huge file, scanned
  image-only PDF), analysis correctness against fixtures, chat grounding (including at least one
  "should say לא מצאתי מידע ודאי" test case), RTL rendering, rate-limit enforcement.
- Sign-off report per phase before it's considered "done."
**Must focus on:**
- Citation accuracy: does every red flag/chat answer actually point to a real contract excerpt
  and a real law section (not a fabricated one)?
- The "לא מצאתי מידע ודאי" fallback path — must be provably reachable, not just theoretical.
- RTL/Hebrew rendering across all pages and states.
- Free-tier constraints not silently violated (e.g. no runaway embedding costs).
**Must NOT do:**
- Fix bugs directly — hand off to bug-fixer with a precise repro.
- Expand scope by testing features not in requirements (e.g. non-residential leases).
**Depends on:** `docs/REQUIREMENTS.md`, all backend/frontend deliverables.

---

## bug-fixer — Phase 7
**Mission for this project:** Resolve every issue qa-tester logs without regressing the
grounded-citations principle or introducing scope creep.
**Must deliver:**
- Fixes committed against qa-tester's issue log, with the log updated to closed/verified.
- Regression notes for any fix touching the analysis/chat prompts or RPC queries (highest-risk area).
**Must focus on:**
- Correctness of citations and the hallucination-avoidance fallback above all else.
- RTL layout regressions.
- Rate-limit and error-state correctness.
**Must NOT do:**
- Silently change API contracts or DB schema — any such change must be flagged back to
  project-architect, not made unilaterally.
- Add new features while "fixing" — fixes only.
**Depends on:** qa-tester's issue log, `API_CONTRACT.md`.

---

## docs-writer — Phase 8
**Mission for this project:** Produce the portfolio-facing README and any supporting docs that
let a reviewer understand and (optionally) run the project without live access to the author.
**Must deliver:**
- `README.md` — problem statement, product flow GIF/screenshots, architecture diagram, stack
  list, setup instructions (`.env.local` keys needed), and a live demo URL.
- Brief note on limitations (3-law scope, not legal advice, free-tier constraints) matching the
  disclaimer language from ux-ui-designer's spec.
**Must focus on:**
- Making the architecture and RAG grounding approach legible to a technical reviewer in under 2
  minutes of reading.
- Accurate, current screenshots/GIF of the actual shipped UI (not mockups).
**Must NOT do:**
- Write marketing copy beyond what's needed for a portfolio README (no separate landing-page copywriting — that's ux-ui-designer/frontend-developer's job in P6).
- Document features that don't exist or are out of scope.
**Depends on:** every prior deliverable; final deployed app.

---

## Risk Map

1. **Grounded-citation failure (hallucinated legal claims).** The single biggest threat to the
   project's actual goal — an ungrounded "red flag" or chat answer is worse than no answer.
   **Owned by:** `backend-developer` (prompt design + retrieval quality in P3/P5) with
   **`qa-tester`** as the enforcement gate (must actively try to break grounding, including
   forcing the "לא מצאתי מידע ודאי" path) before any phase is signed off.
2. **Knesset law-corpus fragility (P1).** If scraping fails or produces incomplete/incorrect law
   text, every downstream red flag and citation is built on a bad foundation. **Owned by:**
   `backend-developer` (must ensure `data/laws/*.txt` fallback is populated with real, verified
   text, not placeholders) with **`project-architect`** accountable for having decided that
   fallback strategy is acceptable up front.
3. **RTL/Hebrew UX quality on a portfolio-critical first impression.** If the landing page or
   viewer feels like an LTR app awkwardly mirrored, it undermines the "Hebrew-first" premise and
   the portfolio's credibility. **Owned by:** `ux-ui-designer` + `visual-designer` (design phase)
   with **`frontend-developer`** accountable for faithful implementation and **`qa-tester`**
   for catching RTL regressions before ship.
