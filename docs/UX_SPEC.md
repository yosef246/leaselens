# LeaseLens — UX Spec

Status: Phase 2 deliverable (ux-ui-designer). Formalizes the Hebrew-RTL information
architecture and interaction flows on top of `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`,
and `docs/DECISIONS.md`. Does not alter routes, schema, or the D2 disclaimer wording — all are
locked upstream and restated verbatim where relevant. No colors, hex values, or typography are
chosen here (visual-designer, Phase 3, owns that). No code/JSX — structure and behavior only.

**Primary user in mind:** "Noa" — first-time Hebrew-speaking renter, no legal background, wants
a fast, plain-language, citation-backed answer to "is this clause normal, and is it legal?"
Every layout decision below optimizes for her scanning speed and trust, not for density or
cleverness. Secondary user (portfolio reviewer) is served by the same screens — `/admin/metrics`
and the landing page double as portfolio artifacts, per `TEAM_PLAN.md`.

---

## 1. Screen Inventory

Flat list of every screen the frontend developer builds. Each maps 1:1 to an entry in
`ARCHITECTURE.md` §2/§7 — no screen here is invented outside P0–P7, and no route in
`ARCHITECTURE.md` is missing a screen.

### `/` — Landing
- **Feature:** P6 (Landing + polish).
- **Purpose:** Public marketing/portfolio entry point; explains the product and converts to
  sign-up, or routes an already-signed-in user straight into the product.
- **Sections:** Top bar (logo + "התחברות/הרשמה" or, if signed in, "לניתוח החוזה שלי" CTA + user
  menu) · Hero (headline + one-line value prop + primary CTA) · How-it-works (3–4 numbered
  steps: העלה חוזה → קבל תקציר ודגלים אדומים → שאל שאלות → קבל תשובה מבוססת) · Demo placeholder
  (static screenshot or short GIF slot — content owned by docs-writer/frontend, this spec only
  reserves the section) · Disclaimer (D2 wording, non-fixed, inline in page flow — see §6) ·
  Footer (minimal: link to `/admin/metrics` for reviewers, no user-facing nav clutter).
- **Empty state:** N/A (static content).
- **Loading state:** N/A (server-rendered/static; no async data fetch blocks first paint).
- **Error state:** N/A.
- **Auth required:** No (public). CTA behavior branches on auth state (see §3).

### Disclaimer Onboarding Gate — global overlay, not a route
- **Feature:** P6 / D2 placement #1.
- **Purpose:** Force-acknowledge the legal disclaimer before any part of the app is usable, on
  first entry to the app in this browser.
- **Sections:** LeaseLens wordmark · Verbatim D2 text in a prominent callout · "הבנתי" checkbox ·
  disabled-until-checked "המשך" primary button.
- **Empty/loading/error state:** N/A (static, client-only, no network call).
- **Auth required:** No — appears before and independent of auth state (see §6 for exact
  trigger logic).

### `/sign-in` and `/sign-up` — Clerk-hosted auth
- **Feature:** Cross-cutting requirement #35 (REQUIREMENTS.md), auth model in
  `ARCHITECTURE.md` §4.
- **Note:** `ARCHITECTURE.md`'s folder tree does not list an explicit `app/sign-in` /
  `app/sign-up` route pair — this is a gap in the architecture doc, not a new feature. Clerk
  requires *some* mounted UI for sign-in/up. This spec assumes the conventional Clerk catch-all
  routes (`app/sign-in/[[...sign-in]]/page.tsx`, `app/sign-up/[[...sign-up]]/page.tsx`) hosting
  Clerk's `<SignIn/>`/`<SignUp/>` components, reachable both as full pages (deep-link, direct
  nav, middleware redirect target) and optionally opened as a modal from the landing CTA for a
  faster perceived flow. **Flagged to project-architect/backend-developer to confirm and add
  these two folders to the structure** — this is the one screen this spec had to infer rather
  than read directly off `ARCHITECTURE.md`.
- **Purpose:** Create/authenticate the Clerk identity that backs `profiles.id`.
- **Sections:** Clerk's own hosted form (email/password or configured providers) — LeaseLens
  wraps it only with the app's RTL shell (logo, background) since Clerk components are
  themeable but not redesigned here (that's visual-designer's token pass, see D2/§6 for what
  must additionally appear on this page).
- **Empty state:** N/A.
- **Loading state:** Clerk's own inline spinner during submit.
- **Error state:** Clerk's own inline field errors (surfaced in Hebrew if Clerk locale is set to
  `he` — a configuration flag for frontend-developer, not a new UI to design).
- **Auth required:** No (these ARE the auth screens). Redirect target for `middleware.ts` when
  an unauthenticated user hits `/upload`, `/contract/:id`, or `/admin/metrics`.

### `/upload` — Upload
- **Feature:** P2.
- **Purpose:** Accept a Hebrew rental-contract PDF and carry the user through ingestion to a
  finished `contract_chunks` row, then hand off to `/contract/[id]`.
- **Sections:** Header (shared authenticated-shell TopNav) · `UploadDropzone` (drag-and-drop +
  file-picker fallback) · `ProgressStepper` (appears only once a file is selected/uploading) ·
  inline rate-limit / validation error banner slot.
- **Empty state:** Default view before any file is chosen: dropzone with instructional copy
  ("גררו לכאן את קובץ ה-PDF של החוזה, או לחצו לבחירה") and accepted-format hint ("PDF בלבד, עד
  [X]MB").
- **Loading state:** `ProgressStepper` mid-flight (see §3/§5.4 for exact stages).
- **Error state:** Inline banner above the dropzone: non-PDF rejection, file-too-large, parse
  failure, or 429 rate-limit — each with a distinct Hebrew message and a way to retry or dismiss
  (see §9).
- **Auth required:** Yes (redirect to `/sign-in` if no session, per `middleware.ts`).

### `/contract/[id]` — Contract Viewer
- **Feature:** P3 (consumes analysis stream) + P4 (viewer/red flags) + P5 (chat).
- **Purpose:** The core product screen — Hebrew summary, streamed red flags each traceable to
  source text and law, and a RAG chat for follow-up questions.
- **Sections:** Header/toolbar (contract file name, analysis status indicator, "שתף / הדפס"
  button) · Left pane: `PdfViewer` · Right pane: tabbed `SummaryPanel` / `RedFlagList` / `ChatPanel`
  (see §5.5 for why this is tabbed, not 3 columns) · `DisclaimerFooter` (fixed, always visible) ·
  `DisclaimerPreShareModal` (triggered by "שתף / הדפס").
- **Empty state:** Immediately after navigation, before the first streamed token arrives:
  skeleton summary line + 3 skeleton `RedFlagCard`s (see §9). If `analysis_status` somehow never
  starts (edge case), an explicit "מתחיל ניתוח…" placeholder rather than a blank pane.
- **Loading state:** Progressive — summary text and red flag cards stream in individually;
  see §5.5 and §9 for exact skeleton→content transition per element.
- **Error state:** (a) contract not found or not owned by caller → full-page 404-style message
  ("החוזה לא נמצא") with a link back to `/upload`, no partial UI leaks; (b) `analysis_status =
  'failed'` (including the D7 mid-chunk-failure case) → explicit banner in the summary/red-flag
  pane ("הניתוח נתקל בשגיאה ולא הושלם") with a retry action, never a silently-partial result;
  (c) chat send failure → inline retry affordance on the failed message bubble, rest of thread
  intact.
- **Auth required:** Yes.

### `/admin/metrics` — Metrics
- **Feature:** P7 (SHOULD).
- **Purpose:** Portfolio/ops artifact — aggregate, non-PII numbers about the deployed system.
- **Sections:** Header (shared TopNav) · KPI tile row (contract count, avg analysis time, avg
  red flags/contract) · "Top-cited laws" ranked list/table (law name + citation count).
- **Empty state:** Zero contracts processed yet → "אין עדיין נתונים להצגה" placeholder in place
  of KPI tiles/table, not zeros-that-look-like-a-bug.
- **Loading state:** Skeleton KPI tiles + skeleton table rows while `GET /api/admin/metrics`
  resolves.
- **Error state:** Inline banner with retry button if the metrics fetch fails.
- **Auth required:** Yes, gated the same as every other protected route by `middleware.ts`.
  **Flag:** `ARCHITECTURE.md`/`DECISIONS.md` define no separate admin role — any signed-in Clerk
  user can currently view this page. Acceptable for a single-portfolio-owner deployment (data
  shown is aggregate/non-PII), but this spec does not invent a role system to restrict it
  further; flagged here for awareness, not treated as a UX gap to solve.

### Navigation Map
```
/                        → /sign-up (CTA, signed out) · /upload (CTA, signed in)
/sign-in                 → /sign-up (link) · /upload (on success, or original deep-link target)
/sign-up                 → /sign-in (link) · /upload (on success)
/upload                  → /contract/:id (auto, on successful ingest)
/contract/:id            → /upload (breadcrumb/back, to analyze another contract)
/admin/metrics           → (reached by direct URL / footer link; no deep links out)
Disclaimer Gate           → blocks and overlays whichever route was requested until acknowledged
```
Note: there is intentionally no "my contracts" list/dashboard screen — it is not defined in
`ARCHITECTURE.md`'s route set. `/upload` doubles as the authenticated user's landing point
(see CTA branching above). If a returning-user contract history becomes a real requirement, that
is a new feature to route back through project-architect, not something to add here.

---

## 2. Primary User Flow (end-to-end)

```
1.  User lands on "/" (or any deep link).
2.  Disclaimer Gate check (localStorage `leaselens_disclaimer_ack_v1`):
    - If absent: full-screen gate blocks everything. User reads D2 text, checks "הבנתי",
      clicks "המשך". Gate writes the localStorage flag and unmounts, revealing the originally
      requested route.
    - If present: gate never renders; flow continues immediately.
3.  User reads hero + how-it-works, clicks primary CTA.
4.  Not signed in → routed to /sign-up. Signed in already → routed straight to /upload (skip 5–7).
5.  User creates an account via Clerk /sign-up (email/password or configured provider).
6.  Clerk webhook (`/api/webhooks/clerk`) upserts `profiles` row server-side — invisible to user.
7.  On success, Clerk redirects to /upload (or back to the original deep-link target, e.g. a
    contract URL the user tried to open while signed out).
8.  On /upload, user drags a PDF onto the dropzone (or uses the file picker).
9.  Client-side validation: is it a .pdf? If not → inline Hebrew error, file rejected before any
    network call (edge case, §9).
10. Upload begins: ProgressStepper shows "מעלה קובץ…" while POST /api/contracts/upload is
    in flight (Storage write + pdf-parse + chunk + embed happen server-side inside this one
    request per ARCHITECTURE.md §7).
11. Edge: server returns 429 (rate limit) → stepper stops, inline banner: "הגעת למגבלת 5 העלאות
    ליום. נסה/י שוב מחר." No partial progress shown as if it succeeded.
12. Edge: server returns a parse/storage error → stepper stops, inline banner with a generic
    Hebrew retry message ("אירעה שגיאה בעיבוד הקובץ, נסה/י שוב"), file re-selectable.
13. Success: response includes the new contract id. Client immediately navigates to
    /contract/[id] — no separate "processed!" confirmation screen; the destination page itself
    is the confirmation (see §5.4 for why the last stepper stage is realized as the destination
    page's own streaming UI rather than a blocking step on /upload).
14. On /contract/[id] mount, client fires POST /api/contracts/[id]/analyze and begins rendering:
    skeleton summary line, 3 skeleton RedFlagCards.
15. As the stream emits summary fragments and validated red flags, skeletons are replaced
    in-place by real content — the user is reading real Hebrew content well before the full
    ~60s analysis window closes.
16. Edge: a chunk fails mid-analysis (D7) → an explicit inline notice appears in the red-flag
    pane ("חלק מהניתוח לא הושלם") rather than the UI silently looking "done" with fewer flags
    than the contract actually contains.
17. Edge: contract has zero red flags after a completed analysis → an explicit positive empty
    state in the red-flag pane ("לא נמצאו דגלים אדומים בבדיקה הראשונית") — never just an empty
    list with no explanation.
18. User clicks "הראה במקור" on a RedFlagCard.
19. PdfViewer (left pane) scrolls to the page containing that card's `contract_citation` and
    highlights the matching text span; the triggering RedFlagCard gets a visual "active" state
    so the user can trace which card produced which highlight.
20. User switches the right-pane tab from "דגלים אדומים" to "שאל שאלה" (ChatPanel).
21. User types a free-text Hebrew question and submits.
22. Edge: empty submit → submit button disabled/no-op, no network call for blank input.
23. Client shows the user's message bubble immediately, then a streaming placeholder
    ("חושב…" / animated dots) for the assistant's reply while POST /api/contracts/[id]/chat
    streams tokens.
24. Answer streams in token-by-token; once streaming completes, citation chips render beneath
    the answer, each labeled with its source (contract page or law section).
25. Edge: retrieval confidence too low / question out of scope → assistant bubble renders
    exactly "לא מצאתי מידע ודאי", with no citation chips (since there is nothing grounded to
    cite) — this is a valid, expected, non-error state, styled as a neutral/informational
    bubble, not an error bubble.
26. Edge: chat request fails outright (network/server error) → assistant bubble shows a distinct
    error state ("לא הצלחנו לקבל תשובה, נסה/י שוב") with a retry action, visually different from
    the "לא מצאתי מידע ודאי" grounded-empty-answer state so the user never confuses "no answer
    found" with "something broke."
27. User may click "שתף / הדפס" at any point on /contract/[id] → DisclaimerPreShareModal opens
    (D2 wording) → confirm → window.print() (see §6).
```

### Secondary flow: returning signed-in user hits a stale/foreign contract link
```
1. User navigates directly to /contract/:id (bookmark, shared link, or expired session retry).
2. Route checks ownership server-side; if the id doesn't exist or belongs to another user,
   the API returns 404 (per ARCHITECTURE.md §4 — "verify ownership ... 404 if not owner/not
   found", deliberately not 403, to avoid confirming the id exists for another user).
3. UI renders the "החוזה לא נמצא" full-page state (§1), with a single CTA back to /upload.
```

---

## 3. Screen-by-Screen Layout

### 3.1 `/` — Landing
Single-column, top-to-bottom document flow (no split panes). Order, top to bottom:
1. TopNav — logo (start/right side, per RTL) · auth-aware CTA (end/left side).
2. Hero — headline, one-sentence subhead, primary CTA button, optional secondary "איך זה עובד"
   anchor-link.
3. How-it-works — 3–4 step sequence, numbered left-to-right in code order but each step's
   internal text is right-aligned; sequence reads visually right→left to match RTL scanning
   (step 1 rightmost, step "n" leftmost) — **flag to visual-designer/frontend:** this reverses
   the DOM/visual order from a typical LTR "step 1 left → step n right" layout; do not mirror
   the numbers themselves, only their visual position.
4. Demo placeholder — reserved block for a screenshot/GIF (content supplied by docs-writer).
5. Inline disclaimer block (D2 verbatim, not fixed — see §6 placement #1 vs. this inline
   restatement; the *gate* is the mandatory placement, this inline block is a courtesy repeat
   for anyone who scrolls the marketing page without re-triggering the gate).
6. Footer — minimal links.

### 3.2 Disclaimer Onboarding Gate
Full-viewport overlay (modal-like, but not dismissible by backdrop click or Escape — this is
intentional friction, not a bug, per D2's "must be acknowledged" requirement). Centered card:
wordmark → D2 text in a bordered/callout treatment (visually distinct from body copy, but no
specific color chosen here — visual-designer decides the "this is a warning" treatment) →
checkbox + label "הבנתי" → primary button "המשך", disabled until the checkbox is checked. No
close/skip control anywhere on this screen.

### 3.3 Sign-in / Sign-up
Centered single-column card (Clerk's default hosted layout), wrapped in the app's RTL shell
(logo above the form, link to switch between sign-in/up below it). No split panes, no marketing
copy repeated here — keep it minimal and fast.

### 3.4 `/upload`
Single-column, centered content area (not full split layout — this screen doesn't need two
panes since there's no PDF to preview yet). Order:
1. TopNav (shared authenticated shell).
2. `UploadDropzone` — large drop target, centered, with icon + instructional text + "או לחצו
   לבחירת קובץ" secondary action. Accepts drag-over visual state (per visual-designer) and
   keyboard-operable file picker fallback (§7 accessibility).
3. `ProgressStepper` — appears only after a file is selected, replacing or overlaying the
   dropzone. Stages, in RTL reading order (rightmost = first, matching the how-it-works
   convention above):
   `מעלה קובץ… → מחלץ טקסט… → מפצל לקטעים… → יוצר embeddings…`
   **Implementation note (flagged, not a hard requirement):** `POST /api/contracts/upload` is a
   single request/response per `ARCHITECTURE.md` §7, not a staged SSE stream — so this stepper's
   sub-stages are necessarily either (a) a single "מעלה ומעבד…" indeterminate state with one
   combined label, which is the safe baseline this spec assumes unless backend adds staged
   progress events, or (b) if backend-developer chooses to add lightweight progress events
   later, the 4 discrete stages above can be wired to real signals. Frontend should build the
   4-stage visual component regardless (it degrades gracefully to "stage 1 of 1 = processing"
   if no staged signal exists), because REQUIREMENTS.md #10 explicitly asks for visible
   processing progress, not just a spinner.
   A 5th implied stage, "מנתח את החוזה…", is **not** shown as a stepper step on this page — it
   begins only after navigation to `/contract/[id]`, realized as that page's own streaming
   skeleton experience (P3). Rationale: showing "analyzing" as a blocking stepper step here
   would make the user wait on a page with nothing to read; navigating immediately once chunks
   exist and starting the visible analysis stream on the destination page (which already has
   Hebrew content forming) makes the ~60s feel faster, per TEAM_PLAN's "make the wait feel fast"
   mandate.
4. Inline error/rate-limit banner slot, above the dropzone/stepper, appears only on failure.

### 3.5 `/contract/[id]`
RTL split layout. Full-viewport height minus TopNav and the fixed `DisclaimerFooter`.

```
┌───────────────────────────────────────────────────────────────────────┐
│ TopNav / toolbar: contract file name · status pill · "שתף / הדפס"     │
├──────────────────────────────────┬─────────────────────────────────────┤
│                                    │  [tabs: דגלים אדומים | שאל שאלה]   │
│         PdfViewer (LEFT)          │                                     │
│   react-pdf pages, vertical       │  Tab "דגלים אדומים" (default):      │
│   scroll, zoom controls           │    SummaryPanel (streams first)     │
│                                    │    RedFlagList (streams next,       │
│                                    │      skeleton → real cards)         │
│                                    │                                     │
│                                    │  Tab "שאל שאלה":                   │
│                                    │    ChatPanel (message thread +       │
│                                    │      input, always available once   │
│                                    │      contract_chunks exist, i.e.    │
│                                    │      independent of analysis        │
│                                    │      completion — chat does not     │
│                                    │      need red flags to be done)     │
├──────────────────────────────────┴─────────────────────────────────────┤
│ DisclaimerFooter — fixed, D2 verbatim text, always visible               │
└───────────────────────────────────────────────────────────────────────┘
```

**Panel-order decision (flag to visual-designer/frontend-developer):** RedFlagList/Chat sit on
the **right** (RTL primary/first-scan position), PdfViewer sits on the **left** (reference/detail
pane, consulted after clicking into a card). This reading of `MASTER_PROMPT.md`'s literal
"react-pdf left … RedFlagCard list right" phrasing happens to align exactly with RTL master-detail
convention (list = right/first, detail = left/secondary), so this spec locks it in rather than
re-deciding it. Do not mirror this to "PDF right" without revisiting this note.

**Why tabs, not a third column:** `ARCHITECTURE.md`/P4 specify a two-pane split (PDF + red flag
list); P5 adds `ChatPanel` "on the contract page" without specifying a third column. A genuine
3-column layout is cramped on common laptop widths once Hebrew legal text is involved. This spec
resolves the ambiguity by putting Summary+RedFlagList and ChatPanel as two tabs within the same
right-hand pane, keeping the PDF persistently visible regardless of which tab is active (so
"הראה במקור" always has somewhere to act on, and clicking it also force-switches the tab back to
"דגלים אדומים" if the user was in the chat tab when they clicked a citation chip that points at a
red flag — see §3.6). **This is a UX decision, not a hard architectural constraint** — if
frontend-developer finds a 3-column layout works at the target breakpoints, that's an acceptable
deviation as long as PDF-left/list-first-right ordering and disclaimer-footer placement are kept.

**Toolbar status pill:** reflects `analysis_status` — "בתהליך ניתוח…" (processing, with a subtle
progress indicator), "ניתוח הושלם" (completed), or "הניתוח נכשל" (failed, styled distinctly and
paired with the retry banner described in §1/§9).

**Mobile (narrow viewport):** the two-pane layout collapses to a single column with a 3-way tab
switcher at the top: `PDF | דגלים אדומים | שאל שאלה` (PDF becomes its own tab here, since there's
no room to keep it persistently visible alongside the other content). Clicking "הראה במקור" while
on the red-flags tab force-switches to the PDF tab, scrolls, and highlights.

### 3.6 ChatPanel (detail)
- Message thread, newest at the bottom, auto-scrolls on new content (standard chat behavior).
- User's own messages: right-aligned bubble (matches RTL "self" convention — see §5 rationale).
- Assistant messages: left-aligned bubble, plain streaming text while tokens arrive.
- Once an assistant message finishes streaming, a row of `CitationChip`s renders directly under
  that bubble (not before — chips only ever attach to a completed, validated answer, never to a
  partial stream, since the backend only emits the citations block after streaming completes).
- Each chip: short label identifying the source (e.g., "חוזה · עמ' 2" for a contract chunk, or
  the law name + section for a law chunk). **Optional enhancement (not required by P5's
  acceptance check, flagged as a nice-to-have only):** clicking a contract-chunk chip could
  scroll/highlight the PDF the same way "הראה במקור" does, for interaction consistency. If
  implemented, it should also force-switch to the PDF-visible layout on mobile, exactly like
  §3.5's card behavior.
- Grounded-empty-answer state: assistant bubble renders literally "לא מצאתי מידע ודאי" — no
  chips row beneath it (there is nothing to cite), and this bubble is styled as a neutral
  informational state, explicitly distinguished from the network/server-error bubble (§2 step
  26) so the two are never visually confusable.
- Input row: fixed at the bottom of the ChatPanel/tab, text field + send button, disabled while
  the previous answer is still streaming (no overlapping requests) with a "ChatPanel is busy"
  visual cue.
- Empty state (first time opening the tab, no messages yet): a short instructional line and 1–2
  example question chips (e.g., "מה קורה אם אני עוזב אחרי חודשיים?") the user can tap to
  pre-fill the input — this doubles as an implicit onboarding hint and mirrors the success
  criterion question from REQUIREMENTS.md.

### 3.7 `/admin/metrics`
Single-column, top-to-bottom:
1. TopNav.
2. KPI tile row (3 tiles: contract count, avg analysis time, avg red flags/contract) — each
   tile: big number + small label, no chart complexity needed.
3. "Top-cited laws" section: ranked list or simple table (law name, citation count), sorted
   descending.
No split layout, no RTL-specific ordering concerns beyond standard right-aligned text/tables.

---

## 4. Disclaimer UX (D2 / D5) — exact placements

The verbatim wording (do not alter, copied exactly from `DECISIONS.md` D2):

> ⚠️ מידע כללי בלבד — אינו ייעוץ משפטי. האפליקציה מסתמכת על ניתוח אוטומטי מול טקסטים חוקיים ועשויה לטעות או להחמיץ הקשר. להחלטה משפטית ממשית פנה/י לעורך/ת דין מוסמך/ת.

### Placement 1 — Onboarding Gate (blocking, one-time)
- Component: `DisclaimerOnboardingGate` (per `ARCHITECTURE.md` §8).
- Trigger logic (this spec's precise definition, since architecture only says "first entry to
  the app"): mounted once at the **root layout**, checked on **every** client-side navigation
  and hydration, not just on `/`. It reads `localStorage['leaselens_disclaimer_ack_v1']` on
  mount; if absent, it renders the full-screen blocking gate **regardless of which route the
  user actually requested** (so a deep link straight into `/upload` or `/contract/:id` with an
  existing Clerk session but no local ack still sees the gate first). If present, it never
  renders and adds no visual overhead to any screen.
- Dismissal: only via the "הבנתי" checkbox + "המשך" button (see §3.2). No backdrop-click, no
  Escape-key dismissal — acknowledgment must be an explicit affirmative action.
- After dismissal: writes the localStorage key, never shows again in that browser (until the
  version suffix `_v1` changes, which is an owner-only future decision if wording changes).

### Placement 2 — Persistent Footer (non-dismissible, always visible)
- Component: `DisclaimerFooter`, mounted in `app/contract/[id]/page.tsx`'s layout only (this is
  "every contract-analysis result screen" — there is exactly one such screen in this app's route
  set, per `ARCHITECTURE.md`).
- Behavior: fixed to the bottom of the viewport, visible without scrolling, on-screen at all
  times while `/contract/[id]` is open — no close/dismiss control. Content area above it must
  reserve bottom padding equal to its height so no other content (PDF pages, chat input,
  red-flag cards) is ever obscured behind it.
- Text size may be smaller than the onboarding gate's version (it's a persistent reminder, not a
  first-read moment), but must remain fully legible, never truncated or ellipsis-clipped.

### Placement 3 — Pre-print/share modal (dismissible, action-gated)
- Trigger: a small "שתף / הדפס" button in the `/contract/[id]` toolbar (per `ARCHITECTURE.md` §8
  — this is the architecture's own minimal, in-spirit addition to host this required placement;
  no other export/share feature exists and none should be invented here).
- Component: `DisclaimerPreShareModal` — standard dismissible dialog (backdrop click/Escape
  allowed here, unlike the onboarding gate, since this isn't a one-time consent moment but a
  repeatable pre-action confirmation). Shows the verbatim D2 text, a confirm button
  ("הבנתי, המשך להדפסה") and a cancel option.
- On confirm: calls `window.print()` (per architecture; no other export mechanism exists).
- **D5 requirement — print stylesheet, independent of the modal:** the on-screen modal dialog
  does not itself appear in the printed/PDF output (dialogs are not part of the printable
  document flow). A **separate, screen-hidden, print-only disclaimer block** must exist in the
  page markup — visually hidden in normal browsing (`display: none` outside `@media print`),
  revealed only inside the print stylesheet (`display: block` under `@media print`) — containing
  the exact same verbatim D2 text, positioned at the top of the printed page (or repeated at top
  and bottom if the print layout spans multiple pages), so that any physical printout or
  "print to PDF" output always carries the disclaimer even though the user never sees this
  specific DOM node while browsing normally.
- Print stylesheet layout intent (structure only, no visual spec): hide all interactive chrome
  when printing — TopNav, tab switcher, chat panel, "שתף / הדפס" button, the on-screen
  `DisclaimerFooter` (its fixed positioning is meaningless on paper) — and show only: contract
  file name/title, the print-only disclaimer block (top), the Hebrew summary, the red-flag list
  in a flattened, non-interactive form (no "הראה במקור" buttons, since there's no PDF pane to
  scroll on paper), and optionally the print-only disclaimer block again at the bottom of the
  last page.

---

## 5. Component Hierarchy

```
Layout / shell
  RootLayout                          — <html dir="rtl" lang="he">, ClerkProvider, DisclaimerOnboardingGate mount point
  TopNav (logo, auth-aware CTA/user menu)  — landing, /upload, /contract/[id], /admin/metrics
  DisclaimerOnboardingGate             — global, root-mounted (§4 placement 1)
  DisclaimerFooter                     — /contract/[id] only (§4 placement 2)
  DisclaimerPreShareModal              — /contract/[id] only (§4 placement 3)

Upload (/upload)
  UploadDropzone (drag state, file-picker fallback, format hint)
  ProgressStepper (4 labeled stages + implicit 5th realized on next page, §3.4)
  InlineErrorBanner (non-PDF / too-large / parse-failed / 429 rate-limit variants)

Contract Viewer (/contract/[id])
  PdfViewer (react-pdf wrapper: page render, zoom, scroll-to + highlight-overlay API)
  TabSwitcher (דגלים אדומים | שאל שאלה) — desktop right pane; PDF|flags|chat 3-way on mobile
  SummaryPanel (streaming Hebrew summary text, skeleton→content)
  RedFlagList (ordered list container, skeleton→card streaming)
    RedFlagCard
      SeverityBadge (variants: high/medium/low — label + icon, never color-only, §7 a11y)
      CategoryTag (variants: illegal/unfair/ambiguous — visually distinct shape/position from SeverityBadge)
      ContractCitationBlock (verbatim excerpt, blockquote styling, optional "הצג עוד" truncation)
      LawCitationLine (human-readable law_citation text)
      ExplanationText (Hebrew plain-language paragraph)
      ShowSourceButton ("הראה במקור" — triggers PdfViewer scroll+highlight + card active state)
    RedFlagCardSkeleton (loading placeholder, structurally mirrors RedFlagCard's regions)
  EmptyRedFlagsNotice ("לא נמצאו דגלים אדומים…") — completed analysis, zero flags
  AnalysisFailedBanner ("הניתוח נכשל" / mid-chunk failure notice, D7) + retry action
  StatusPill (processing / completed / failed, in toolbar)

ChatPanel
  MessageThread
    UserMessageBubble
    AssistantMessageBubble (streaming variant while in-flight; final variant once complete)
    CitationChipRow (contract-chunk chip, law-chunk chip variants)
    GroundedEmptyAnswerBubble ("לא מצאתי מידע ודאי" — visually distinct from ErrorBubble)
    ErrorBubble (request failed, retry action)
  ChatEmptyState (instructional line + example-question chips)
  ChatInputBar (text field + send button, disabled-while-streaming state)

Admin Metrics (/admin/metrics)
  KpiTile (contract count / avg analysis time / avg red flags per contract variants)
  KpiTileSkeleton
  TopCitedLawsTable (or ranked list)
  MetricsEmptyState ("אין עדיין נתונים להצגה")
  MetricsErrorBanner (retry)

Landing (/)
  Hero
  HowItWorksStep (x3–4)
  DemoPlaceholder
  InlineDisclaimerBlock (courtesy repeat of D2 text, see §3.1)

Shared primitives (shadcn/ui-based, cross-screen)
  Button (primary/secondary/destructive-ish "confirm risky action" variants) — everywhere
  Checkbox (with label) — DisclaimerOnboardingGate
  Modal/Dialog — DisclaimerPreShareModal, any confirm-destructive-action dialogs
  Banner/Alert (info / warning / error variants) — upload errors, analysis-failed, metrics error
  Skeleton — RedFlagCardSkeleton, SummaryPanel loading, KpiTileSkeleton, chat "thinking" state
  Tabs — TabSwitcher (contract viewer), mobile 3-way switch
  Tooltip — optional, e.g. truncated citation "הצג עוד"
```

---

## 6. RTL & Hebrew UX Notes

- Root document is `dir="rtl" lang="he"` (already an architecture decision, restated here as a
  UX-enforced requirement, not optional per-component styling).
- **Directional icons must be mirrored**, not just repositioned: "forward/next" chevrons point
  left in this app (since "forward" in RTL reading motion goes right→left); "back" chevrons
  point right. Apply this to any pagination, stepper, or wizard-style control.
- **Reading-order convention locked for this app:** primary/first-scanned content sits on the
  right (RedFlagList/Chat pane, how-it-works step 1, TopNav logo); secondary/reference/detail
  content sits on the left (PdfViewer, later how-it-works steps). See §3.5 and §3.1 for the two
  concrete applications of this rule.
- **Numbers, dates, and mixed Hebrew/Latin content:** always use Western Arabic numerals (0–9)
  embedded in Hebrew text (standard convention, not a stylistic choice) and rely on the
  browser's Unicode bidi algorithm to keep digit runs left-to-right *within* the surrounding
  RTL flow — never manually reverse a number or date string. This matters specifically for: law
  section numbers with Hebrew-letter suffixes (e.g., `12(ב)`, `9א`), page indicators
  ("עמוד 3 מתוך 12"), and dates (format via a locale-aware formatter, e.g. `Intl.DateTimeFormat
  ('he-IL')`, not manual string concatenation). Flagging this explicitly because it is a common
  RTL bug source, not because any component needs special code here beyond using standard
  locale-aware formatting.
- **PDF content itself is not re-flowed:** `react-pdf` renders the original PDF pages, whose
  internal Hebrew text is already correctly RTL as authored in the source document — the app's
  `dir="rtl"` only affects the *chrome around* the PDF (zoom controls, page indicator, any
  fallback pagination), not the rendered page content.
- **Scroll axis for "הראה במקור":** vertical only (top-to-bottom through stacked PDF pages) —
  RTL affects horizontal reading order within a line/page, not the vertical page-stacking scroll
  axis, so no special "reverse scroll direction" logic is needed; this is a standard document
  scroll like any LTR PDF viewer, just with an RTL-aware toolbar around it.
- **Highlight overlay:** an absolutely-positioned overlay drawn over the matched text span's
  bounding box (as reported by `react-pdf`'s text layer) — position/size logic is
  direction-agnostic; only the *toolbar* around the viewer needs RTL treatment.
- **Chat bubble alignment (explicit decision, not left ambiguous):** the user's own messages
  align right, the assistant's align left (§3.6). This is a deliberate convention lock for this
  app — flag to frontend-developer/visual-designer to apply consistently rather than defaulting
  to whatever a component library ships with for LTR locales.
- **Forms:** labels sit above or at the start (right) of their field; helper/error text below
  the field, right-aligned, same as the field's own text alignment.
- **Severity/category badges:** never rely on color alone to distinguish high/medium/low or
  illegal/unfair/ambiguous — each must carry a text label (and, ideally, a distinct icon) so the
  distinction survives grayscale printing (relevant given D5's print requirement) and
  color-vision-deficient users (see §7).

---

## 7. States (loading / empty / error / success matrix)

| Surface | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Upload dropzone | N/A (pre-file) | Default instructional dropzone (this *is* the empty state) | Non-PDF / too-large / parse-fail banner, file re-selectable | Auto-navigates to `/contract/[id]` (no separate success screen) |
| Upload — rate limit | N/A | N/A | 429 banner: "הגעת למגבלת 5 העלאות ליום. נסה/י שוב מחר." shown *before* any file processing starts (checked server-side first per `ARCHITECTURE.md` §8) | N/A |
| Analysis summary | Skeleton text lines while streaming | N/A (summary is never truly empty on a completed analysis; if it were, treat as failed-state, not empty-state) | `AnalysisFailedBanner`, incl. D7 mid-chunk-failure explicit notice | Full Hebrew summary text, status pill = "ניתוח הושלם" |
| Red flag list | `RedFlagCardSkeleton` x3 initially, replaced/appended as validated flags stream in | `EmptyRedFlagsNotice` — only shown once `analysis_status = 'completed'` with zero rows (never confuse "still processing" with "genuinely none found") | Same `AnalysisFailedBanner` as summary (shared failure surface) | Populated `RedFlagCard` list |
| Chat | Streaming assistant bubble placeholder while a response is in flight; input disabled meanwhile | `ChatEmptyState` before first message | `ErrorBubble` on request failure, with retry; distinct from grounded-empty-answer | Streamed answer + `CitationChipRow` |
| Chat — no grounded answer | N/A | N/A | Not an error — `GroundedEmptyAnswerBubble` ("לא מצאתי מידע ודאי"), visually distinct from `ErrorBubble` | N/A (this state IS the successful, correct behavior per REQUIREMENTS #24) |
| `/admin/metrics` | Skeleton KPI tiles + skeleton table rows | "אין עדיין נתונים להצגה" if zero contracts exist | Inline banner + retry | Populated KPI tiles + top-cited-laws table |
| Contract not found/not owned | N/A | N/A | Full-page "החוזה לא נמצא" + CTA back to `/upload` | N/A |
| Sign-in/up | Clerk's own inline spinner | N/A | Clerk's own inline field errors | Redirect to `/upload` or original deep-link target |

**Overriding principle (P6 acceptance check):** no surface above may ever render `undefined`, a
raw error/stack trace, or a silent blank area — every async surface has an explicit, Hebrew,
human-readable representation for all four states even where a given state is rare (e.g., "zero
red flags" is rare but must still have a designed empty state, not an accidentally-blank list).

---

## Summary

Delivered `docs/UX_SPEC.md` covering 7 screens/screen-groups (`/`, Disclaimer Onboarding Gate,
`/sign-in`+`/sign-up`, `/upload`, `/contract/[id]`, `/admin/metrics`, plus the ChatPanel detailed
as a sub-spec), one end-to-end primary flow plus 2 secondary flows (rate-limit/error branches and
stale/foreign-contract access), a ~35-entry component hierarchy, and a full loading/empty/error/
success matrix across every async surface.

Flags for downstream agents:
- **RTL split-panel orientation is locked:** RedFlagList/Chat on the right (primary), PdfViewer
  on the left (detail) — this matches `MASTER_PROMPT.md`'s literal left/right wording read
  through an RTL lens; do not re-derive or flip it.
- **ChatPanel lives in a tab alongside the red-flag list** (not a third column) — a UX resolution
  of an architecture ambiguity (P5 didn't specify chat's placement relative to P4's two panes);
  frontend-developer may deviate to a 3-column layout only if it holds up at target breakpoints.
- **Chat bubble alignment is an explicit convention** (user = right, assistant = left) — apply
  consistently rather than inheriting a component library's LTR default.
- **Severity/category must never be color-only** — text label + icon required on every badge, a
  hard constraint for visual-designer's token choices, not just a nice-to-have.
- **`/sign-in` and `/sign-up` routes are inferred, not found in `ARCHITECTURE.md`'s folder
  tree** — flagged for project-architect/backend-developer to formally add.
- The Upload page's staged `ProgressStepper` (4 labeled stages) assumes backend may only provide
  a single request/response for now; it degrades to one combined "processing" state gracefully
  and does not block on backend adding staged progress events.
