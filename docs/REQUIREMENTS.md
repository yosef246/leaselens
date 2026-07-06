# LeaseLens — Requirements (אפיון)

Status: Phase 1 deliverable (requirements-analyst). Formalizes `MASTER_PROMPT.md`; does not
override any locked decision in it (stack, DB schema, model, target laws, phase order).

---

## 1. Goals & Non-Goals

### Primary Goal
Give a Hebrew-speaking renter, within ~60 seconds of uploading their lease PDF, a trustworthy,
citation-grounded picture of what is risky or illegal in their contract — so they can negotiate
or walk away with confidence, without paying a lawyer.

### Secondary Goals (ranked)
1. Demonstrate a production-quality, full-stack RAG application as a portfolio piece
   (streaming AI, pgvector search, real legal corpus, polished Hebrew RTL UI).
2. Provide a conversational interface (RAG chat) so the user can ask follow-up questions in
   natural Hebrew and get cited answers instead of re-reading the whole contract.

### Non-Goals
- This is **not** a substitute for legal advice and does not aim for bar-certified accuracy.
- Not a multi-tenant SaaS with billing, teams, or roles — single user account per Clerk identity.
- Not a general contract analyzer — scoped strictly to Israeli **residential rental** contracts.
- Not a mobile app — responsive web only.
- Not a multi-language product — Hebrew-first; no English UI localization in scope.

---

## 2. Target Users & Primary Use Cases

**Persona — "Noa," the first-time renter**
Mid-20s, signing her first apartment lease in Israel, Hebrew native speaker, comfortable with
web apps on desktop and mobile browsers, no legal background. Wants a fast, plain-language
answer to "is this clause normal, and is it legal?" before she signs or asks the landlord to
change something.

**Persona — "Recruiter/hiring manager reviewing the portfolio"**
Technical or semi-technical evaluator judging the project as a work sample. Wants to see the
product actually work end-to-end (upload → summary → red flags → chat) in a live demo, and
wants a README that explains the architecture.

Primary use case: Noa uploads a scanned/exported Hebrew lease PDF, waits under a minute, reads a
Hebrew summary and a list of severity-ranked red flags each pointing to the exact contract clause
and the exact law section it may violate, then asks 1–3 follow-up questions in the chat panel.

---

## 3. Problem & Value

**Pain:** Israeli rental contracts are written in dense legal Hebrew; renters routinely sign
clauses that are unenforceable or illegal under חוק הגנת הדייר / חוק השכירות והשאילה / חוק שכירות
הוגנת (e.g. illegal deposit terms, unfair early-exit penalties) because they can't tell normal
boilerplate from a red flag, and a lawyer consult is slow and costly for a document they need to
sign this week.

**Value / success from the user's POV:** "I uploaded my lease and in under a minute I had a
plain-Hebrew summary, a short list of things to push back on — each one pointing to the exact
sentence in my contract and the exact law it conflicts with — and I could ask a follow-up
question and get a straight, cited answer instead of a vague one."

---

## 4. Functional Requirements

Grouped by the P0–P7 phases already defined in `MASTER_PROMPT.md`. No new phases are introduced.

### P0 — Bootstrap
1. **[MUST]** The system must provide a running Next.js 15 (App Router, TS) project with
   Tailwind + shadcn/ui, and all locked dependencies installed (Anthropic SDK, OpenAI SDK,
   Supabase client, Clerk, Vercel AI SDK, zod, pdf-parse, react-pdf).
2. **[MUST]** The system must expose a `.env.local` template listing every required secret
   (Supabase, Clerk, Anthropic, OpenAI, PostHog) with no real keys committed.
3. **[MUST]** The system must have a folder skeleton reflecting the intended structure
   (`app/`, `lib/ai`, `lib/chunking`, `lib/supabase`, `scripts/`, `components/`).

### P1 — Law corpus
4. **[MUST]** The system must scrape or otherwise obtain full text for the three target laws
   (חוק השכירות והשאילה תשל"א-1971, חוק שכירות הוגנת תשע"ז-2017, חוק הגנת הדייר [נוסח משולב]
   תשל"ב-1972) from main.knesset.gov.il, with a local-file fallback if scraping fails.
5. **[MUST]** The system must chunk law text by סעיף (section) markers, correctly handling
   sub-clauses, preserving `law_name`, `law_year`, `section_number`, `section_title`, `category`,
   `is_binding`.
6. **[MUST]** The system must embed every law chunk (OpenAI text-embedding-3-small) into
   `law_chunks` idempotently (re-running the embed script must not create duplicates).
7. **[MUST]** The user-facing effect: a semantic query such as "החזר פיקדון" must return
   sensible, on-topic law chunk matches via `match_law_chunks`.

### P2 — Upload + parse
8. **[MUST]** The user can upload a Hebrew rental contract as a PDF via drag-and-drop or file
   picker at `/upload`.
9. **[MUST]** The system must store the uploaded PDF in Supabase Storage, extract text via
   pdf-parse, create a `contracts` row, chunk the text (500 tokens / 100 overlap), embed each
   chunk, and persist to `contract_chunks` with page numbers.
10. **[MUST]** The system must show upload/processing progress and a clear "processed" state
    in the UI once chunks exist in Supabase.
11. **[SHOULD]** The system must validate the upload is a PDF and reject non-PDF files with a
    clear Hebrew error.

### P3 — Analysis engine
12. **[MUST]** The system must run `/api/contracts/[id]/analyze`, which for each contract chunk
    retrieves relevant law chunks via `match_law_chunks`, then asks Claude to produce a
    structured JSON result: `{ summary, red_flags: [{severity, category, contract_citation,
    law_reference, explanation}] }`.
13. **[MUST]** The system must stream the analysis to the client rather than waiting for the
    full result.
14. **[MUST]** The system's prompts must forbid hallucination and mandate that every red flag
    cites both an exact contract excerpt and an exact law reference.
15. **[MUST]** The system must persist `summary` on `contracts` and each red flag as a row in
    `red_flags` with severity (`high|medium|low`) and category (`illegal|unfair|ambiguous`).
16. **[MUST]** Acceptance: a known-bad clause (e.g. illegal deposit terms) must return a
    high-severity red flag citing the correct law section.

### P4 — Viewer + red flags UI
17. **[MUST]** The user can open `/contract/[id]` and see a split layout: PDF (react-pdf) on
    one side, red flag list on the other, laid out correctly for RTL.
18. **[MUST]** Each `RedFlagCard` must show a severity badge, the contract citation, the law
    citation/reference, and an explanation in Hebrew.
19. **[MUST]** The user can click "הראה במקור" on a red flag and the PDF viewer scrolls to and
    highlights the corresponding source text.
20. **[SHOULD]** The system must render results progressively (skeleton loaders) as the
    streamed analysis arrives, rather than a blank screen until everything finishes.

### P5 — RAG chat
21. **[MUST]** The user can ask a free-text Hebrew question about their contract in a
    `ChatPanel` on the contract page.
22. **[MUST]** The system must embed the question, retrieve top matches from
    `match_contract_chunks` (contract-specific, e.g. top 4) and `match_law_chunks` (e.g. top 2),
    and send both as context to Claude.
23. **[MUST]** The system must stream the chat answer and attach a structured citations block
    (which contract/law chunks were used) rendered as citation chips.
24. **[MUST]** If no grounded answer can be found in retrieved context, the system must respond
    with "לא מצאתי מידע ודאי" rather than fabricating an answer.
25. **[MUST]** Acceptance: a question like "מה קורה אם אני עוזב אחרי חודשיים?" must return an
    answer with visible citations.

### P6 — Landing + polish
26. **[MUST]** The system must provide a landing page with a hero ("See what's really in your
    lease." — or Hebrew equivalent), a how-it-works section, and a demo (GIF or equivalent).
27. **[MUST]** The system must handle empty, loading, and error states across upload, analysis,
    and chat — no screen may show `undefined`, raw stack traces, or a silent blank state.
28. **[MUST]** The system must enforce a rate limit of 5 uploads/day per user (free-tier cost
    control).
29. **[SHOULD]** The system must include basic SEO metadata (title, description, OG tags) on
    the landing page.

### P7 — Deploy + metrics
30. **[MUST]** The system must be deployed on Vercel (frontend + API routes) with Supabase as
    the managed Postgres/Storage backend, reachable at a public URL.
31. **[SHOULD]** The system must expose `/admin/metrics` showing contract count, average
    analysis time, average red flags per contract, and top-cited laws.
32. **[SHOULD]** The system must integrate PostHog for basic product analytics.
33. **[MUST]** The project must ship a README with screenshots and an architecture diagram
    sufficient for a portfolio reviewer to understand the system without running it.
34. **[COULD]** Custom domain for the deployed app.

### Cross-cutting
35. **[MUST]** The user can sign up / sign in via Clerk before uploading a contract; contracts
    and red flags must be scoped to the authenticated user (`profiles.id` mirrors Clerk ID).
36. **[MUST]** The system must validate every API route's input/output against a Zod schema.

---

## 5. Non-Functional Requirements

- **RTL-first:** all UI (layout, text alignment, icon mirroring, PDF/chat panel order) must be
  built and tested in Hebrew RTL as the default and only supported direction. No English LTR
  fallback UI is in scope.
- **Streaming everywhere:** analysis and chat responses must render incrementally
  (token/chunk-level) using the Vercel AI SDK — never a single blocking request/response for
  AI-generated content.
- **Grounded citations only:** every AI-generated claim about legality or risk must be backed by
  a retrieved contract excerpt and/or law section; if retrieval confidence is insufficient the
  system must surface "לא מצאתי מידע ודאי" instead of guessing. This applies to both the
  analysis engine (P3) and chat (P5).
- **API contract discipline:** every API route boundary (request and response) must be validated
  with Zod; invalid input must return a structured error, never a silent 500 or unvalidated pass-through.
- **Free-tier only:** the system must operate within Vercel free tier, Supabase free tier, and
  reasonable pay-as-you-go usage of Anthropic/OpenAI APIs (no paid infrastructure tier). Rate
  limiting (5 uploads/day) exists specifically to protect this constraint.
- **Performance:** end-to-end analysis (upload → summary + red flags visible) should complete in
  roughly 60 seconds for a typical multi-page lease, per the product flow promise; partial
  results must stream in well before the 60s mark.
- **Security/privacy:** contracts contain PII (names, addresses, ID-adjacent info); access must
  be restricted to the uploading user via Clerk-authenticated, per-user row scoping. No contract
  content should be exposed to other users or logged in plaintext to third-party analytics.
- **Accessibility:** basic keyboard navigability and sufficient color contrast for severity
  badges (high/medium/low) is expected; full WCAG audit is not required (see Scope Boundaries).
- **No dead code; commit per acceptance:** carried over verbatim from MASTER_PROMPT as a
  process constraint for all downstream builder agents.

---

## 6. Explicit Scope Boundaries

**In scope**
- Hebrew residential rental contracts only (the 3 named target laws).
- Single-user accounts (Clerk), no teams/orgs/sharing.
- PDF upload only (typed or scanned text extractable by pdf-parse).
- Web app, responsive desktop + mobile browser layouts.
- Streaming AI summary, red flags, and RAG chat as specified in P3/P5.
- Deployment to Vercel + Supabase free tier with a public demo URL.
- Basic admin metrics page and README as portfolio artifacts.

**Out of scope**
- Any law beyond the 3 named statutes (e.g. tax law, commercial lease law, condo/tenant-association bylaws).
- Contract *generation* or *editing* — this is an analysis tool only, never modifies the lease.
- Multi-language support (English/Arabic UI) — Hebrew-first only, no i18n framework required.
- Payment/billing, subscriptions, teams, or per-seat roles.
- Native mobile apps (iOS/Android).
- OCR for image-only/scanned PDFs beyond what pdf-parse can extract as text.
- Legal liability features (e-signature, lawyer marketplace, dispute filing, court forms).
- Full WCAG/accessibility certification.
- Real-time collaboration (multiple users viewing/annotating the same contract).
- Historical law-version tracking (amendments over time) — corpus reflects current law text only.
- Automated re-scraping/refresh pipeline for law updates post-launch (P1 scraper is run manually/on demand, not scheduled).

---

## 7. Success Criteria

1. A new user can go from landing page → signed in → uploaded PDF → visible processing state in
   under 2 minutes of hands-on time, with no undefined/blank screens.
2. Analysis of a real Hebrew lease completes and streams a Hebrew summary plus at least one
   correctly-cited red flag (contract citation + law reference) within ~60 seconds.
3. A known illegal/unfair clause (e.g. non-refundable deposit terms) is detected as a
   high-severity red flag citing the correct law section, verified against at least one seeded
   test contract.
4. Clicking "הראה במקור" on any red flag scrolls and highlights the correct location in the PDF
   viewer, verified for at least 3 distinct red flags.
5. RAG chat answers a realistic tenant question ("מה קורה אם אני עוזב אחרי חודשיים?") with a
   response that includes visible citation chips, not an ungrounded free-text answer.
6. When retrieval confidence is low, chat responds with "לא מצאתי מידע ודאי" instead of
   fabricating a legal claim (verified with at least one out-of-scope test question).
7. The deployed public URL works end-to-end (upload → analysis → chat) for a first-time visitor
   with no local setup, and the README explains the architecture with a diagram and screenshots.

---

## 8. Open Questions & Assumptions

Only genuinely blocking items are listed; everything else has been resolved by decision below.

1. **Knesset scraping fragility (BLOCKING for P1 execution, not for planning).** main.knesset.gov.il
   has no stable public API for section-level law text; HTML structure can change without notice
   and may block automated fetches (robots.txt / anti-bot measures). **Assumption made:** P1 will
   treat the local `data/laws/*.txt` fallback as the primary reliable source and the live scraper
   as best-effort/opportunistic, matching MASTER_PROMPT's own "fetch + fallback" design. This
   should be validated by the architect/backend-developer before P1 is marked done — if scraping
   fails outright, the fallback files must still be populated with real, correct legal text
   (not placeholders) before proceeding to P1's acceptance check.
2. **Legal disclaimer requirement (BLOCKING for product/legal risk, not for architecture).**
   MASTER_PROMPT does not mention a disclaimer, but a tool making "illegal/unfair" legal claims
   to end users carries real-world risk (this is explicitly a portfolio project, not licensed
   legal advice). **Assumption made:** a visible, permanent disclaimer ("כלי זה אינו מהווה ייעוץ
   משפטי...") is required on the landing page and on every contract analysis view. This is
   treated as part of P6 (Landing + polish) functional scope, added under [MUST] cross-cutting
   non-functional requirement, not a new phase. **Flagging to owner:** confirm wording/placement
   is acceptable — no other decision needed.
3. **Definition of "correct" red flag for acceptance testing.** MASTER_PROMPT's acceptance check
   ("bad clause returns high-severity flag with correct law reference") requires at least one
   seeded reference contract with known-correct expected flags to test against.
   **Assumption made:** the QA phase (qa-tester) is responsible for sourcing/authoring 1–2
   sample lease PDFs containing intentionally illegal/unfair clauses for this purpose; this is
   not a new law-corpus requirement, just a test fixture. No owner decision needed unless a real
   anonymized sample contract is preferred over a synthetic one.

No other assumptions materially change scope — all stack, schema, model, and phase-order
decisions in MASTER_PROMPT are treated as final and are not re-litigated here.
