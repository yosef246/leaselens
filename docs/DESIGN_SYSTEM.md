# LeaseLens — Design System

Status: Phase 3 deliverable (visual-designer). Applies concrete visual tokens on top of
`docs/UX_SPEC.md`'s locked information architecture and `docs/ARCHITECTURE.md`'s Tailwind +
shadcn/ui stack. Does not change any layout, route, component hierarchy, or the D2 disclaimer
wording — all restated verbatim where relevant. No React/JSX in this document — tokens and specs
only, for `frontend-developer` to implement directly.

Reference anchor: **Stripe's documentation pages crossed with a Tel-Aviv law firm's letterhead** —
calm paper-and-ink neutrals, one restrained navy-teal brand color, no gradients, no purple, no
"generic AI SaaS" look. The product handles real legal text in Hebrew; the visual system's job is
to make that text easy to read for long stretches and to make risk (red flags) unmistakable even
in grayscale print.

---

## 1. Foundations

### 1.1 Design Direction

**"Paper & Ink"** — a warm, slightly off-white paper background (not stark `#FFFFFF`) paired with
a single deep ink-navy brand color, restrained amber/gold reserved strictly for warning and
medium-severity contexts, and clear red/green/blue semantics elsewhere. Typography is Hebrew-first:
generous line-height, larger-than-typical body size (dense legal paragraphs need room to breathe),
and a monospace treatment for law section numbers/citations so mixed Hebrew/Latin/digit strings
(`12(ב)`, `סעיף 9א`, `עמוד 3 מתוך 12`) read unambiguously. The overall tone is **trustworthy,
calm, precise** — a tool a first-time renter believes over a slick consumer app, closer to Stripe
docs or a Notion legal template than a startup landing page. Deliberately avoids the default
"Inter + indigo/purple gradient" AI-product look: no gradients anywhere in this system, no purple
in the palette, and the brand color is a desaturated navy-teal rather than a vivid SaaS blue.

### 1.2 Color Palette — Light (default)

All neutrals are Tailwind's documented **Stone** scale (real, exact, widely available values —
not invented) chosen over Slate/Gray for its warm "paper" undertone appropriate to a document-
reading tool. Brand color is a custom desaturated ink-navy-teal.

```
Brand
- brand              #1E4E6B   (ink navy-teal — primary actions, links, active states)
- brand-hover        #17405A
- brand-pressed      #123244
- brand-fg           #FFFFFF   (text/icon on brand fill — contrast 8.9:1)
- brand-tint         #E7EEF2   (10% wash — active nav item, selected tab underline area)
- brand-tint-strong  #CFE0E8   (drag-over state, focused-panel backgrounds)

Neutrals (Tailwind Stone scale)
- bg-page            #FAFAF9   (stone-50  — page background, warm paper white)
- bg-surface         #F5F5F4   (stone-100 — panel/card recessed background, skeleton base)
- bg-elevated        #FFFFFF   (cards, modals, popovers — paired with shadow, see 1.5)
- border-subtle      #E7E5E4   (stone-200 — default card/input border)
- border-strong      #D6D3D1   (stone-300 — emphasized border, dividers, focused-adjacent)
- text-primary       #1C1917   (stone-900 — body copy, headings)
- text-secondary     #57534E   (stone-600 — captions, metadata, secondary paragraphs)
- text-muted         #A8A29E   (stone-400 — placeholders, disabled text, timestamps)

Semantic (system-wide alerts/banners — NOT the severity/category system, see §3/§4)
- success            #15803D   (green-700)
- success-bg         #DCFCE7   (green-100)
- warning            #92400E   (amber-800 — reused exactly as severity-medium, §3)
- warning-bg         #FEF3C7   (amber-100)
- danger             #B91C1C   (red-700 — reused exactly as severity-high, §3)
- danger-bg          #FEE2E2   (red-100)
- info               #1D4E74   (brand-adjacent blue, used for neutral/informational states
                                  e.g. GroundedEmptyAnswerBubble)
- info-bg            #E7EEF2   (= brand-tint)
```

Contrast note: `text-primary` on `bg-page` = 16.1:1, `text-secondary` on `bg-page` = 7.7:1,
`text-muted` on `bg-page` = 2.7:1 (muted text is **decorative-only** — never used for
information-bearing copy, only timestamps/placeholders, per WCAG's non-text exemption).

### 1.3 Typography

```
Font family (Hebrew + Latin, unified type system):
  sans:  "IBM Plex Sans Hebrew", "IBM Plex Sans", system-ui, sans-serif
  mono:  "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace
```

**Why IBM Plex, not Inter/Heebo/Assistant:** IBM Plex Sans Hebrew and IBM Plex Sans are drawn as
one coordinated type family specifically to keep Hebrew and Latin/numeral glyphs visually
consistent in weight and proportion when mixed inline (law citations like `סעיף 12(ב)` or
`חוק החוזים (חלק כללי), התשל"ג-1973`) — a real, documented design goal of the Plex family, not a
generic default. It also ships a matching monospace (IBM Plex Mono) used below for section numbers
and page indicators, giving the product a "precise, technical, legal-drafting" texture that a
plain sans stack can't. Both are free, on Google Fonts, self-hostable. Weights used: 400
(Regular), 500 (Medium), 600 (SemiBold), 700 (Bold) — no other weight is introduced.

```
Type scale                size / line-height / weight       Usage
- display        34px / 42px / 700     Landing hero headline only (rare, one per page)
- h1              28px / 36px / 700     Page titles ("החוזה שלי", gate title)
- h2              22px / 30px / 600     Section headers (SummaryPanel title, KPI section title)
- h3              18px / 26px / 600     Card titles (RedFlagCard heading line, modal titles)
- body            16px / 26px / 400     Default paragraph text — sized up from a typical 16/24
                                          because dense Hebrew legal paragraphs (ExplanationText,
                                          ContractCitationBlock) need extra line-height to scan
- body-sm         14px / 22px / 400     Secondary text, chat bubbles, table cells, chip labels
- caption         12px / 18px / 500     Badge/tag text, footer disclaimer minimum size, timestamps
- mono-citation   13px / 20px / 500     IBM Plex Mono — law section numbers, page indicators
                                          ("עמ' 3 מתוך 12"), chunk/citation ids — always inline,
                                          never a full paragraph
```

Numerals are always Western Arabic (0–9) per `UX_SPEC.md` §6, rendered by the browser's bidi
algorithm inside RTL flow — never manually reversed. Wrap section numbers/page indicators in
`font-mono` (tabular figures) specifically so `12(ב)` and `9א` never visually collide with
surrounding Hebrew letters.

### 1.4 Spacing & Layout

```
Spacing scale (px):      4, 8, 12, 16, 20, 24, 32, 40, 48, 64
Marketing/Upload max-width:  1120px (landing, /upload — single-column centered content)
Contract Viewer width:       full-bleed (edge-to-edge minus page gutter) — the split PDF/list
                              layout needs real estate; do not cap it at 1120px like other pages
Page gutter:             24px desktop, 16px mobile
Card padding:            24px (RedFlagCard, KpiTile, modal body)
Compact card padding:    16px (CitationChip container, chat bubble)
Form field gap:          16px
Section gap:             48px (landing sections), 32px (panel-internal sections)
DisclaimerFooter height: 48px desktop / 64px mobile (2 lines) — content area above it MUST
                          reserve `padding-bottom` equal to this exact height
```

### 1.5 Radii, Shadows, Borders

```
Radius:  sm 4px (chips, badges) · md 8px (buttons, inputs, small cards) ·
         lg 12px (RedFlagCard, KpiTile, modals) · xl 16px (DisclaimerOnboardingGate card) ·
         full 9999px (SeverityBadge pill, avatar, StatusPill)

Shadow:  sm  0 1px 2px rgba(28,25,23,0.06)
         md  0 2px 4px -2px rgba(28,25,23,0.06), 0 4px 6px -1px rgba(28,25,23,0.08)
         lg  0 4px 6px -4px rgba(28,25,23,0.08), 0 10px 15px -3px rgba(28,25,23,0.10)
         focus-ring   0 0 0 3px rgba(30,78,107,0.35)   (brand at 35% alpha)

Border:  1px solid border-subtle   — default card/input border
         1.5px solid border-strong — emphasized (focused-adjacent, active RedFlagCard ring uses
                                      severity color instead, see §3)
```

---

## 2. Dark Theme (parallel palette)

Dark mode is not called out as a hard requirement in `BRIEF.md`/`MASTER_PROMPT.md`, but is
specified here so the token set is complete and future-proof; **frontend-developer may ship
light-mode-only for P6 and wire dark mode later purely by swapping the CSS variable block below —
no component-level changes needed** if the shadcn token pattern (§9) is followed.

```
Neutrals (dark)
- bg-page            #0F1417   (near-black, warm undertone — not pure #000)
- bg-surface         #171D21   (panel/card recessed background)
- bg-elevated        #1D2428   (cards/modals, paired with a 1px lighter border instead of shadow)
- border-subtle      #2B3338
- border-strong      #3D4750
- text-primary       #F2F1EF
- text-secondary     #B7B2AC
- text-muted         #7C7772

Brand (dark — lightened for contrast on dark surfaces)
- brand              #2D6E96
- brand-hover        #3A82AF
- brand-pressed       #1F5476
- brand-fg           #FFFFFF   (contrast 5.55:1 on brand)
- brand-tint         #16303D
- brand-tint-strong  #1D3D4D

Semantic (dark)
- success            #4ADE80   on bg  #052E16
- warning            #FCD34D   on bg  #451A03
- danger             #FCA5A5   on bg  #450A0A   (contrast 8.5:1, verified §3 methodology)
- info               #7DB8DC   on bg  #102636
```

Dark-mode pattern used throughout: **light-300-weight text token on a 900/950-weight tinted
background** (e.g. `#FCA5A5` on `#450A0A`) — this pairing reliably clears 7:1+ contrast and is
applied identically to the severity and category systems below (§3.2, §4.2) rather than
re-deriving each color from scratch.

---

## 3. Severity System

**Hard constraint (from `UX_SPEC.md` §6/§7, restated verbatim):** severity is never color-only.
Every `SeverityBadge` renders **color + Hebrew text label + a distinct icon shape** (not just a
different color of the same icon) so the distinction survives grayscale printing and is legible
to color-vision-deficient users.

### 3.1 Light mode

| Severity | Label (he) | Text/icon color | Background | Icon (lucide-react) | Contrast (text/bg) |
|---|---|---|---|---|---|
| High | `גבוה` | `#B91C1C` | `#FEE2E2` | `OctagonAlert` (stop-sign silhouette) | **5.30:1** ✅ AA |
| Medium | `בינוני` | `#92400E` | `#FEF3C7` | `TriangleAlert` (warning triangle) | **6.37:1** ✅ AA |
| Low | `נמוך` | `#334155` | `#E2E8F0` | `CircleAlert` (info-style circle) | **8.40:1** ✅ AA |

Deliberately **not a single hue at three lightnesses** (that would still read as "red, red, red"
in grayscale) — each severity uses a different hue family AND a geometrically distinct icon
(octagon / triangle / circle), so shape alone still communicates severity if color is stripped
entirely (print, colorblind simulation).

`SeverityBadge` renders as a solid-filled pill (`radius: full`): icon (16px) + 4px gap + label,
`caption` type weight 600, `padding: 4px 10px`.

### 3.2 Dark mode

| Severity | Text | Background | Contrast |
|---|---|---|---|
| High | `#FCA5A5` | `#450A0A` | 8.51:1 |
| Medium | `#FCD34D` | `#451A03` | ~8:1 (same light-300-on-950 pattern) |
| Low | `#94A3B8` | `#0F172A` | ~7.5:1 (same pattern) |

### 3.3 PDF highlight ↔ severity consistency (TEAM_PLAN requirement)

When "הראה במקור" is clicked on a `RedFlagCard`, the `PdfViewer` overlay highlight uses the
**same severity color at 30% opacity fill + 100% opacity 1.5px border**, so the highlighted PDF
span visually matches the card that triggered it:

```
High highlight:    fill rgba(185,28,28,0.30)   border #B91C1C
Medium highlight:  fill rgba(146,64,14,0.30)   border #92400E
Low highlight:     fill rgba(51,65,85,0.30)    border #334155
```

A citation chip clicked from `ChatPanel` (optional enhancement, §5) has no severity — it uses a
neutral **citation highlight**: fill `rgba(30,78,107,0.25)` (brand), border `#1E4E6B`, so it is
visually distinguishable from a severity-triggered highlight.

The triggering `RedFlagCard`'s "active" state: `border` switches from `border-subtle` to the
card's own severity color at 1.5px, plus `shadow: md`, plus a 3px severity-colored left accent
bar (`border-inline-start` in RTL) — never relies on background color change alone.

---

## 4. Category System

Categories (`illegal` / `unfair` / `ambiguous`) are rendered by `CategoryTag`, which **UX_SPEC
requires to be visually distinct in shape/position from `SeverityBadge`** (they can co-occur on
the same card — e.g. a flag can be both `severity: high` and `category: illegal`, and the two
must never be visually confusable). Resolution: `CategoryTag` is an **outlined chip** (not filled),
`radius: sm` (not full/pill), placed inline in the card body directly above `ExplanationText`
rather than in the badge row — a different shape AND a different position from `SeverityBadge`.

### 4.1 Light mode

| Category | Label (he) | Text/border color | Background tint | Icon |
|---|---|---|---|---|
| Illegal | `לא חוקי` | `#6D28D9` | `#EDE9FE` | `Gavel` |
| Unfair | `לא הוגן` | `#115E59` | `#CCFBF1` | `Scale` |
| Ambiguous | `לא ברור` | `#57534E` | `#F5F5F4` | `CircleHelp` |

Contrast: illegal 5.99:1, unfair 6.73:1, ambiguous 6.99:1 — all ✅ AA. Hue families (violet / teal
/ stone) are deliberately disjoint from the severity system's (red / amber / slate) so a card
showing both a red `SeverityBadge` and a violet `CategoryTag` never reads as "two severities."

`CategoryTag`: `border: 1px solid <color>`, `bg: <tint>`, `padding: 3px 8px`, icon 14px + 4px gap
+ `caption` weight 500 text.

### 4.2 Dark mode

| Category | Text | Background |
|---|---|---|
| Illegal | `#C4B5FD` | `#2E1065` |
| Unfair | `#5EEAD4` | `#042F2E` |
| Ambiguous | `#D6D3D1` | `#292524` |

---

## 5. Component Visual Specs

Every component in `UX_SPEC.md` §5's hierarchy is covered below. Icons are lucide-react (§7).

### Shared primitives

**Button — primary**
- bg `brand`, fg `brand-fg`; padding `10px 16px`; radius `md`; font `body-sm`/600
- hover bg `brand-hover`; active/pressed bg `brand-pressed`
- disabled: opacity 0.5, `cursor: not-allowed`, no hover change
- focus-visible: `focus-ring` + 2px outline offset

**Button — secondary**
- bg transparent, fg `text-primary`, `border: 1px solid border-strong`
- hover bg `bg-surface`; active bg `border-subtle`
- disabled: opacity 0.5

**Button — destructive-ish (confirm risky action, e.g. print-modal confirm)**
- Not a full "delete" red — this app never deletes data. Uses `brand` fill, same as primary
  (printing/sharing isn't destructive); reserve `danger` fill only for a true irreversible-action
  pattern, which does not exist in this product's P0–P7 scope.

**Checkbox**
- unchecked: `20x20px`, `border: 1.5px solid border-strong`, `radius: sm` (4px), bg `bg-elevated`
- checked: bg `brand`, fg `brand-fg` (Check icon 14px), border `brand`
- focus: `focus-ring`
- label: `body` type, 8px gap from box, `text-primary`

**Modal / Dialog** (`DisclaimerPreShareModal`, any confirm dialogs)
- Overlay: `rgba(28,25,23,0.5)` (stone-900 at 50%)
- Panel: bg `bg-elevated`, radius `xl`, shadow `lg`, padding 24px, max-width 480px
- Title `h3`, body `body`, action row right-aligned in LTR convention but **mirrored for RTL: action
  buttons sit at the start (right) of the row**, cancel/secondary before confirm/primary in DOM
  reading order (rightmost = primary, matching the app's right-to-left "first = most important"
  convention locked in `UX_SPEC.md` §6)

**Banner/Alert** (info / warning / error variants)
- Shared shape: `radius: md`, `padding: 12px 16px`, left accent bar 3px (`border-inline-start`),
  icon (20px) + text (`body-sm`)
- info: bg `info-bg`, border-accent `info`, icon `Info`
- warning: bg `warning-bg`, border-accent `warning`, icon `TriangleAlert` (rate-limit banner uses
  this variant — a limit is not a system failure)
- error: bg `danger-bg`, border-accent `danger`, icon `CircleX` (parse failure, analysis failed,
  chat request failure use this variant)

**Skeleton**
- bg `bg-surface`, animated shimmer: a lighter diagonal gradient sweep (`bg-elevated` at 40%
  opacity) moving left→right over 1.5s, `ease-in-out`, infinite — subtle, not a bouncing pulse
- radius matches the element it stands in for (text line: `sm`, card: `lg`)

**Tabs** (`TabSwitcher`)
- Underline style, not pill/boxed: inactive tab `text-secondary`, `body-sm`/500, no background
- active tab `text-primary`/600, 2px bottom border in `brand`, positioned under the **active
  tab's own label** (RTL: tabs read right→left, "דגלים אדומים" default-active is the rightmost tab)
- Mobile 3-way switch (`PDF | דגלים אדומים | שאל שאלה`): same underline style, horizontally
  scrollable if it overflows a narrow viewport

**Tooltip**
- bg `text-primary` (stone-900), fg `bg-page` (inverted), `body-sm`, radius `sm`, padding `6px 10px`
- used for truncated citation "הצג עוד" affordance only, per UX_SPEC

---

### Upload (`/upload`)

**UploadDropzone**
- Default: `border: 2px dashed border-strong`, radius `lg`, bg `bg-surface`, min-height 240px,
  centered content: `UploadCloud` icon 40px in `text-muted`, `h3` instructional text in
  `text-primary`, `body-sm` format hint in `text-secondary`
- Drag-over state: `border-color: brand`, `bg: brand-tint`, icon color switches to `brand` —
  border style stays dashed (never turns solid, to keep affordance meaning consistent)
- Error state (file rejected client-side): border switches to `1px solid danger`, plus the
  `InlineErrorBanner` (error-variant Banner, above the dropzone, not inside it)
- Keyboard focus (tab to the picker fallback): `focus-ring`

**ProgressStepper**
- Horizontal, RTL reading order (stage 1 rightmost). Each stage: 32px circle + label below
  (`caption`)
- Pending stage: circle `border: 1.5px solid border-strong`, bg `bg-elevated`, label `text-muted`
- Active stage: circle bg `brand`, fg `brand-fg`, subtle pulse animation (opacity 0.85↔1, 1.2s
  loop) — the only place a "processing" pulse motion is used
- Completed stage: circle bg `success`, fg white, `Check` icon 16px
- Connecting line between circles: 2px, `border-subtle` default, `success` once both flanking
  stages are complete

**InlineErrorBanner** — uses the shared error-variant `Banner` above; four Hebrew-copy variants
(non-PDF, too-large, parse-fail, 429) share the identical visual treatment — only text differs.

---

### Contract Viewer (`/contract/[id]`)

**PdfViewer**
- Toolbar (zoom controls, page indicator): bg `bg-surface`, `border-bottom: 1px solid
  border-subtle`, height 44px, icons 20px, page indicator in `mono-citation` type
  ("עמ' 3 מתוך 12")
- Page canvas area: bg `bg-page` outside the rendered page, each PDF page gets `shadow: sm` +
  8px margin between pages (a "stacked paper" feel)
- Highlight overlay: see §3.3 for exact colors — absolutely positioned, `radius: sm` (2px, since
  it traces text bounding boxes, not a card), a 200ms `ease-out` fade-in on appearance

**StatusPill** (toolbar)
- processing: bg `info-bg`, fg `info`, small spinning `Loader2` icon 14px (the only continuously-
  spinning element in the whole product, reserved for this one true "still working" indicator)
- completed: bg `success-bg`, fg `success`, `CircleCheck` icon
- failed: bg `danger-bg`, fg `danger`, `CircleX` icon — visually matches the `AnalysisFailedBanner`
  below it so the two read as one coherent failure signal, not two different-looking errors

**SummaryPanel**
- Streaming text: `body` type, `text-primary`, plain paragraph flow — a thin blinking `brand`-
  colored caret (2px wide, 20px tall, blink 1s) at the end of the text while streaming, removed
  once complete. This is the only per-character-adjacent animation in the system.
- Skeleton: 4 lines of `Skeleton` at `body` line-height, decreasing width (100/95/90/60%) to read
  as "paragraph," not "loading bars"

**RedFlagCard**
- Container: bg `bg-elevated`, `border: 1px solid border-subtle`, radius `lg`, padding 24px,
  `shadow: sm`; **active state** (after "הראה במקור" click): border → severity color 1.5px,
  `shadow: md`, 3px severity-colored `border-inline-start` accent bar (see §3.3)
- Header row: `SeverityBadge` at the row's start (right, RTL) + `h3` short flag title (if any) —
  `ShowSourceButton` at the row's end (left)
- Body order, top→bottom: `CategoryTag` → `ContractCitationBlock` → `LawCitationLine` →
  `ExplanationText`
- **ContractCitationBlock:** blockquote treatment — `bg-surface`, `border-inline-start: 3px solid
  border-strong` (neutral, not severity-colored — this is "what the contract says," not a
  judgment), radius `sm`, padding `12px 16px`, `body-sm` italic-free (Hebrew doesn't italicize
  well; use `text-secondary` color instead of italics to signal "quoted material"). "הצג עוד"
  truncation at 3 lines with a `Tooltip`-free inline text button in `brand`.
- **LawCitationLine:** `body-sm` in `text-secondary`, law name in `text-primary` weight 500, the
  section-number token wrapped in `mono-citation` (e.g. "חוק הגנת הדייר, **סעיף 12(ב)**")
- **ExplanationText:** `body` in `text-primary`, this is the primary reading content of the card
- **ShowSourceButton:** ghost/link style, `body-sm`/600, `brand` color, icon `ArrowLeft` (lucide;
  points left because "reference detail" lives in the left pane and "forward" in this RTL app
  points left per `UX_SPEC.md` §6) at 16px, 4px gap, icon trails the Hebrew label ("הראה במקור ←")
  since the arrow indicates *where* the action goes, not sentence direction

**RedFlagCardSkeleton** — mirrors the exact region layout above using `Skeleton` blocks: a small
pill (badge), an outlined-chip-shaped block (category), a 3-line indented block (citation), a
1-line block (law citation), a 3-line block (explanation) — so the loading state visually
previews the real card's structure, reducing layout shift.

**EmptyRedFlagsNotice**
- Centered card, bg `success-bg`-tinted but text `text-primary` (a *positive* empty state, not a
  generic gray "nothing here"): `CircleCheck` icon 32px in `success`, `h3` "לא נמצאו דגלים אדומים
  בבדיקה הראשונית", `body-sm` secondary line reminding the user this isn't a legal guarantee (ties
  back to the disclaimer, doesn't repeat it verbatim here)

**AnalysisFailedBanner** — error-variant `Banner` (§ shared primitives) + a `Button` (secondary)
"נסה שוב" inline at the banner's end

---

### ChatPanel

**UserMessageBubble**
- Align **right** (RTL self-convention, per `UX_SPEC.md` §3.6/§6 — locked, do not default to an
  LTR library's left-self convention)
- bg `brand`, fg `brand-fg`, radius `lg` with the bottom-right corner squared to `sm` (4px) —
  the classic "tail corner" treatment, mirrored to the right side since the user is right-aligned
- padding `10px 14px`, `body-sm` type, max-width 75% of panel

**AssistantMessageBubble**
- Align **left**, bg `bg-surface`, fg `text-primary`, radius `lg` with bottom-**left** corner
  squared to `sm` (mirrored tail, opposite of the user bubble)
- Streaming variant: same caret treatment as `SummaryPanel` (blinking brand caret at text end)
- Final variant: caret removed; `CitationChipRow` renders directly beneath, 8px gap

**CitationChipRow / CitationChip**
- Chip: `bg-elevated`, `border: 1px solid border-subtle`, radius `full`, padding `4px 10px`,
  `caption` type, icon 14px + 4px gap
- Contract-chunk chip: icon `FileText`, label e.g. "חוזה · עמ' 2" (page number in `mono-citation`)
- Law-chunk chip: icon `Landmark`, label e.g. "חוק הגנת הדייר · סעיף 12"
- Hover (if the optional click-to-highlight enhancement is implemented): `border-color: brand`,
  `bg: brand-tint`

**GroundedEmptyAnswerBubble** ("לא מצאתי מידע ודאי")
- Distinct from both the normal assistant bubble and the error bubble: bg `info-bg`, fg `info`,
  icon `SearchX` 16px preceding the text, **no** `CitationChipRow` beneath (nothing to cite) —
  this reads as "calm, informational," never alarming, since it is a correct/expected outcome

**ErrorBubble**
- bg `danger-bg`, fg `danger`, icon `CircleX` 16px, `body-sm` message + inline `Button`
  (secondary, small) "נסה שוב" — visually unmistakable from `GroundedEmptyAnswerBubble` (danger
  red vs. info blue, `CircleX` vs. `SearchX`) so users never confuse "no answer" with "broke"

**ChatEmptyState**
- Centered, `text-secondary` instructional line, 2 example-question chips below: same visual
  style as `CitationChip` but interactive (`cursor: pointer`, hover `bg-surface`), clicking
  pre-fills `ChatInputBar`

**ChatInputBar**
- Fixed at ChatPanel bottom: `TextInput` (see below) + `Button` primary (icon-only `SendHorizontal`
  16px on narrow widths, icon+label "שלח" on wider)
- Disabled-while-streaming: input `bg-surface`, `cursor: not-allowed`, placeholder replaces with
  "ממתין לתשובה…"; send button disabled (opacity 0.5) — paired with a small `Loader2` spin (14px)
  next to the placeholder as the "busy" visual cue required by `UX_SPEC.md` §3.6

**TextInput** (shared primitive, used here and any future form field)
- bg `bg-elevated`, `border: 1px solid border-strong`, radius `md`, padding `10px 12px`, `body`
  type, `text-primary`; placeholder `text-muted`
- focus: `border-color: brand` + `focus-ring`
- error: `border-color: danger`, helper text below in `danger`, `caption` size
- disabled: bg `bg-surface`, fg `text-muted`, `cursor: not-allowed`

---

### Admin Metrics (`/admin/metrics`)

**KpiTile**
- bg `bg-elevated`, `border: 1px solid border-subtle`, radius `lg`, padding 24px
- Big number: `display`-adjacent but smaller — 30px/36px/700, `text-primary`, `mono-citation`
  family (IBM Plex Mono) for the numeral specifically, since these are pure statistics — reinforces
  the "precise data" feel and keeps digit widths tabular for alignment across 3 tiles
- Label below: `body-sm`, `text-secondary`

**KpiTileSkeleton** — mirrors KpiTile: a wide `Skeleton` block (number) + narrow block (label)

**TopCitedLawsTable**
- Standard table, no split/RTL-specific reordering beyond right-aligned Hebrew text and
  `mono-citation` for the citation-count column (a number)
- Row hover: `bg-surface`
- Header row: `border-bottom: 1.5px solid border-strong`, `body-sm`/600 `text-secondary`

**MetricsEmptyState / MetricsErrorBanner** — same positive-empty and error-Banner treatments as
`EmptyRedFlagsNotice`/`AnalysisFailedBanner` above, for consistency across the app.

---

### Landing (`/`)

**TopNav** — bg `bg-page` (blends with hero, no separate bar color), `border-bottom: 1px solid
border-subtle` only once scrolled (sticky, add border on scroll ≥ 4px via a simple scroll-state
class — a small, optional polish note for frontend-developer, not a hard requirement)

**Hero** — `display` headline in `text-primary`, `h2`-sized subhead in `text-secondary` (not the
full `h2` weight — subhead uses 22px/32px/400), primary CTA `Button`, secondary "איך זה עובד" as a
plain anchor link in `brand` with an underline-on-hover only (no button chrome, to keep visual
hierarchy clearly primary-vs-secondary)

**HowItWorksStep** — numbered circle (32px, `bg: brand-tint`, fg `brand`, `mono-citation` numeral)
+ `h3` step title + `body-sm` description; steps read visually right→left (step 1 rightmost) per
`UX_SPEC.md` §3.1 — this is a **visual/CSS order change only** (e.g. flex `row-reverse` or grid
placement), the DOM order and step numbers themselves are never reversed

**DemoPlaceholder** — bg `bg-surface`, `border: 1.5px dashed border-strong`, radius `lg`,
min-height 320px, centered `ImageIcon` + `body-sm` "תצוגה מקדימה בקרוב" placeholder text (swapped
for the real screenshot/GIF by frontend-developer/docs-writer)

**InlineDisclaimerBlock** — see §6 (identical visual treatment to the gate's callout, smaller)

**Footer** — `bg-surface`, `body-sm` `text-secondary`, minimal single-row links

---

## 6. Disclaimer Visual Treatment (D2 / D5) — all three placements

The verbatim wording (unchanged, restated only for anchoring — do not alter):

> ⚠️ מידע כללי בלבד — אינו ייעוץ משפטי. האפליקציה מסתמכת על ניתוח אוטומטי מול טקסטים חוקיים ועשויה לטעות או להחמיץ הקשר. להחלטה משפטית ממשית פנה/י לעורך/ת דין מוסמך/ת.

All three placements share one base **DisclaimerCallout** visual pattern, sized differently:

```
DisclaimerCallout (base pattern)
- bg: warning-bg (#FEF3C7)
- border-inline-start: 4px solid warning (#92400E)     -- thick accent bar, not just a bg tint
- border (other 3 sides): 1px solid warning at 30% alpha, e.g. rgba(146,64,14,0.3)
- radius: md
- text: text-primary (NOT warning color) at full opacity — the ⚠️ glyph + accent bar carry the
  "this is a warning" signal; body text stays high-contrast and fully legible, never tinted
- icon: the ⚠️ character is already part of the D2 string — do not add a second/duplicate icon
```

**Placement 1 — `DisclaimerOnboardingGate`:** full-viewport overlay, `bg: rgba(28,25,23,0.6)`
scrim behind a centered `bg-elevated` card (radius `xl`, shadow `lg`, max-width 480px, padding
32px). Inside: wordmark (28px logotype + icon mark, `brand` color) → `DisclaimerCallout` at
`body` size (16px/26px) with 16px internal padding → `Checkbox` + "הבנתי" label (8px gap above the
button) → primary `Button` "המשך", **disabled (opacity 0.5, `cursor: not-allowed`) until the
checkbox is checked** — no close/skip control anywhere on this card, matching the UX lock.

**Placement 2 — `DisclaimerFooter`:** fixed to viewport bottom, full width, `bg: warning-bg`,
`border-top: 2px solid warning` (no side/bottom borders needed since it's flush to the viewport
edge), height per §1.4 (48px desktop / 64px mobile), text at `caption` size (12px/18px) minimum —
smaller than the gate's version per UX_SPEC allowance, but never smaller than `caption`, and never
truncated/ellipsis-clipped (allow it to wrap to 2 lines on mobile within the 64px height). Content
padding: `12px 16px`. `z-index` above all page content but below the onboarding gate.

**Placement 3 — `DisclaimerPreShareModal`:** standard `Modal`/`Dialog` (§5 shared primitives) with
the same `DisclaimerCallout` at `body` size inside the dialog body, confirm `Button` (primary)
"הבנתי, המשך להדפסה" + cancel (`Button` secondary or plain text link) "ביטול". Backdrop-click and
Escape ARE allowed here (unlike the gate), per the UX lock — this is a repeatable pre-action
confirmation, not a one-time consent moment.

### Print stylesheet (D5) — print-only disclaimer block

**Hard requirement, independent of the modal:** a screen-hidden, print-only DOM node
(`display: none` outside `@media print`, `display: block` inside it) carrying the exact same
verbatim D2 text, positioned at the top of the printed page (repeated at the bottom too if the
print layout spans multiple pages).

**Print-safe visual spec — do NOT reuse the on-screen amber styling as-is.** Browsers strip
background colors by default when printing unless the user has "background graphics" enabled
(most don't), and many printouts are grayscale. The print disclaimer MUST remain legible under
both conditions:

```css
@media print {
  .disclaimer-print-block {
    display: block;
    background: #FFFFFF;              /* never rely on a color bg surviving print */
    color: #000000;                   /* full black, not warning-amber, for guaranteed legibility */
    border: 2pt solid #000000;        /* solid black border — visible even with backgrounds off */
    padding: 8pt 10pt;
    font-family: "IBM Plex Sans Hebrew", "IBM Plex Sans", sans-serif;
    font-weight: 700;                 /* bold — the ⚠️ glyph + bold black text is print-proof
                                          regardless of color/grayscale printer capability */
    font-size: 11pt;
    margin-bottom: 12pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Hide all interactive chrome per UX_SPEC §4 placement 3 print intent */
  header, nav, [data-tabs], [data-chat-panel], [data-share-print-button],
  .disclaimer-footer /* the fixed on-screen footer is meaningless on paper */ {
    display: none !important;
  }
  [data-show-source-button] { display: none !important; } /* no PDF pane to scroll on paper */
}
```

This is the one place in the whole design system where color is deliberately **not** used to
signal meaning — print legibility (D5) takes priority over on-brand styling, and black-border +
bold-text is the fallback that works on every printer/settings combination.

---

## 7. Iconography

- Icon set: **lucide-react** (matches shadcn/ui's default icon convention, one dependency,
  consistent stroke width).
- Sizes: **16px** (inline with `body-sm`/`caption` text — badges, chips, chat bubbles), **20px**
  (inline with `body`/toolbar buttons), **24px** (standalone, e.g. dropzone icon, empty-state icon
  — never smaller than 24px when used without adjacent text).
- Icon + text pairing: **4px gap**, vertically centered against the text's cap-height, not its
  full line-height box.
- Solo icons (empty states, StatusPill without room for text on very narrow layouts): minimum
  24px, always paired with an `aria-label` even if no visible text (accessibility, §8).
- Stroke width: default lucide `2` throughout — do not mix stroke weights.

---

## 8. Motion

```
Standard transition:     150ms ease-out   (hover/active state changes on all interactive elements)
Modal/Dialog enter:      200ms ease-out, opacity 0→1 + 4px translateY(8px→0)
Modal/Dialog exit:       150ms ease-in, reverse of the above
Skeleton shimmer:        1.5s ease-in-out, infinite, diagonal sweep (§5 shared primitives)
Streaming text caret:    1s step blink (on/off), removed the instant streaming completes
ProgressStepper active:  1.2s opacity pulse (0.85↔1) on the current stage only
Highlight overlay fade:  200ms ease-out opacity 0→1 (PdfViewer scroll+highlight)
Tab underline move:      150ms ease-out, animates `transform`/width, not layout-triggering props
```

No parallax, no scroll-jacking, no decorative page-load animation, no per-character "typewriter"
effect beyond the single blinking caret at the stream's tail. Motion exists only to (a) signal a
state change already happening (loading, streaming, highlighting) or (b) soften a UI
appearance/disappearance (modal, tab switch) — never as ornament.

---

## 9. Accessibility

- **Contrast:** every text/background pairing used for information-bearing content (severity,
  category, semantic banners, body copy) is verified ≥ 4.5:1 in this document (§1.2, §3, §4);
  ratios are stated inline next to each pairing rather than asserted generically.
- **Focus states:** every interactive element (`Button`, `Checkbox`, `TextInput`, tab, chip when
  interactive, `ShowSourceButton`) gets `focus-ring` (0 0 0 3px brand at 35% alpha) on
  `:focus-visible` — never suppressed, never mouse-click-only.
- **Minimum tap targets:** 44×44px for anything tappable on touch (dropzone picker link, send
  button, checkbox's clickable label+box combined area, tab targets) even where the visible glyph
  is smaller — pad the hit area, not the icon.
- **Color-independence:** severity and category are always paired with text label + icon (§3/§4);
  the same rule extends to `StatusPill` (icon differs per state, not just color) and to
  `Banner`/`Alert` variants (icon differs: `Info`/`TriangleAlert`/`CircleX`).
- **RTL icon mirroring:** directional icons (`ArrowLeft`/`ArrowRight` for "forward"/"back",
  pagination chevrons, the `ShowSourceButton` arrow) must be chosen as the RTL-correct lucide icon
  (e.g. use `ArrowLeft` for "forward" directly — do not take an LTR `ArrowRight` and apply a CSS
  `scaleX(-1)` flip, since lucide already ships direction-named variants). **Non-directional icons
  (Gavel, Scale, TriangleAlert, OctagonAlert, FileText, Landmark, CircleCheck, etc.) must NOT be
  mirrored** — flipping a gavel or a document icon horizontally reads as a rendering bug, not
  localization. This distinction (mirror only genuinely directional glyphs) is the one RTL
  iconography rule frontend-developer must apply by hand, not automatically.
- **Print accessibility (D5):** covered in §6 — black-border/bold-text fallback guarantees the
  disclaimer survives grayscale or background-graphics-off printing, which a color-only treatment
  would not.
- **Reduced motion:** wrap all non-essential motion (skeleton shimmer speed, caret blink,
  stepper pulse) in a `prefers-reduced-motion: reduce` media query fallback — reduce to a static
  low-opacity state instead of removing the loading indicator entirely (the user still needs to
  know something is loading).

---

## 10. Tailwind & shadcn/ui Implementation Reference

`ARCHITECTURE.md` confirms Tailwind + shadcn/ui. shadcn's default component primitives consume a
small fixed set of CSS variables in HSL triplets (`--background`, `--primary`, etc.) — those are
mapped below. The severity/category/disclaimer tokens are **not** consumed by shadcn primitives
(they belong to custom components frontend-developer builds: `SeverityBadge`, `CategoryTag`,
`DisclaimerCallout`) so they are kept as plain hex custom properties for simplicity — no need to
force everything through the HSL convention.

### `app/globals.css` — CSS variable block

```css
:root {
  /* shadcn core tokens (HSL triplets, no hsl() wrapper — shadcn's convention) */
  --background: 60 9% 98%;          /* bg-page   #FAFAF9 */
  --foreground: 24 10% 10%;         /* text-primary #1C1917 */
  --card: 0 0% 100%;                /* bg-elevated #FFFFFF */
  --card-foreground: 24 10% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 24 10% 10%;
  --primary: 203 56% 27%;           /* brand #1E4E6B */
  --primary-foreground: 0 0% 100%;
  --secondary: 60 5% 96%;           /* bg-surface #F5F5F4 */
  --secondary-foreground: 24 10% 10%;
  --muted: 60 5% 96%;
  --muted-foreground: 24 5% 64%;    /* text-muted #A8A29E */
  --accent: 203 30% 92%;            /* brand-tint #E7EEF2 */
  --accent-foreground: 203 56% 27%;
  --destructive: 0 65% 42%;         /* danger #B91C1C */
  --destructive-foreground: 0 0% 100%;
  --border: 20 6% 90%;              /* border-subtle #E7E5E4 */
  --input: 20 6% 90%;
  --ring: 203 56% 27%;
  --radius: 0.5rem;                 /* 8px = md, component-level radii override per §1.5 */

  /* Custom, non-shadcn tokens: severity, category, disclaimer (plain hex, not HSL) */
  --severity-high: #B91C1C;         --severity-high-bg: #FEE2E2;
  --severity-medium: #92400E;       --severity-medium-bg: #FEF3C7;
  --severity-low: #334155;          --severity-low-bg: #E2E8F0;

  --category-illegal: #6D28D9;      --category-illegal-bg: #EDE9FE;
  --category-unfair: #115E59;       --category-unfair-bg: #CCFBF1;
  --category-ambiguous: #57534E;    --category-ambiguous-bg: #F5F5F4;

  --disclaimer-bg: #FEF3C7;         --disclaimer-border: #92400E;

  --highlight-high: rgba(185,28,28,0.30);
  --highlight-medium: rgba(146,64,14,0.30);
  --highlight-low: rgba(51,65,85,0.30);
  --highlight-citation: rgba(30,78,107,0.25);
}

.dark {
  --background: 200 10% 6%;         /* bg-page dark #0F1417 */
  --foreground: 60 5% 95%;          /* text-primary dark #F2F1EF */
  --card: 200 10% 9%;               /* bg-elevated dark #1D2428 */
  --card-foreground: 60 5% 95%;
  --popover: 200 10% 9%;
  --popover-foreground: 60 5% 95%;
  --primary: 201 54% 39%;           /* brand dark #2D6E96 */
  --primary-foreground: 0 0% 100%;
  --secondary: 200 10% 12%;         /* bg-surface dark #171D21 */
  --secondary-foreground: 60 5% 95%;
  --muted: 200 10% 12%;
  --muted-foreground: 30 4% 47%;    /* text-muted dark #7C7772 */
  --accent: 199 46% 16%;            /* brand-tint dark #16303D */
  --accent-foreground: 201 54% 70%;
  --destructive: 0 91% 81%;         /* danger dark #FCA5A5 */
  --destructive-foreground: 0 74% 15%;
  --border: 200 9% 18%;             /* border-subtle dark #2B3338 */
  --input: 200 9% 18%;
  --ring: 201 54% 39%;

  --severity-high: #FCA5A5;         --severity-high-bg: #450A0A;
  --severity-medium: #FCD34D;       --severity-medium-bg: #451A03;
  --severity-low: #94A3B8;          --severity-low-bg: #0F172A;

  --category-illegal: #C4B5FD;      --category-illegal-bg: #2E1065;
  --category-unfair: #5EEAD4;       --category-unfair-bg: #042F2E;
  --category-ambiguous: #D6D3D1;    --category-ambiguous-bg: #292524;

  --disclaimer-bg: #451A03;         --disclaimer-border: #FCD34D;
}
```

### `tailwind.config.js` — `theme.extend` snippet

```js
// tailwind.config.js — theme.extend
colors: {
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
  },
  secondary: {
    DEFAULT: 'hsl(var(--secondary))',
    foreground: 'hsl(var(--secondary-foreground))',
  },
  muted: {
    DEFAULT: 'hsl(var(--muted))',
    foreground: 'hsl(var(--muted-foreground))',
  },
  accent: {
    DEFAULT: 'hsl(var(--accent))',
    foreground: 'hsl(var(--accent-foreground))',
  },
  destructive: {
    DEFAULT: 'hsl(var(--destructive))',
    foreground: 'hsl(var(--destructive-foreground))',
  },
  card: {
    DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))',
  },
  // Custom LeaseLens tokens — read directly as hex custom properties, not HSL
  severity: {
    high: 'var(--severity-high)',
    'high-bg': 'var(--severity-high-bg)',
    medium: 'var(--severity-medium)',
    'medium-bg': 'var(--severity-medium-bg)',
    low: 'var(--severity-low)',
    'low-bg': 'var(--severity-low-bg)',
  },
  category: {
    illegal: 'var(--category-illegal)',
    'illegal-bg': 'var(--category-illegal-bg)',
    unfair: 'var(--category-unfair)',
    'unfair-bg': 'var(--category-unfair-bg)',
    ambiguous: 'var(--category-ambiguous)',
    'ambiguous-bg': 'var(--category-ambiguous-bg)',
  },
  disclaimer: {
    bg: 'var(--disclaimer-bg)',
    border: 'var(--disclaimer-border)',
  },
},
fontFamily: {
  sans: ['"IBM Plex Sans Hebrew"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
  mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
},
borderRadius: {
  sm: '4px', DEFAULT: '8px', md: '8px', lg: '12px', xl: '16px', full: '9999px',
},
boxShadow: {
  sm: '0 1px 2px rgba(28,25,23,0.06)',
  md: '0 2px 4px -2px rgba(28,25,23,0.06), 0 4px 6px -1px rgba(28,25,23,0.08)',
  lg: '0 4px 6px -4px rgba(28,25,23,0.08), 0 10px 15px -3px rgba(28,25,23,0.10)',
  'focus-ring': '0 0 0 3px rgba(30,78,107,0.35)',
},
spacing: {
  // Tailwind's default 4px-based scale already covers 4/8/12/16/20/24/32/40/48/64 — no
  // override needed, restated here only to confirm no custom spacing scale is introduced.
},
```

Google Fonts import (add to root layout's `<head>` or `next/font/google`):
```
IBM Plex Sans Hebrew: weights 400, 500, 600, 700 — subset "hebrew" + "latin"
IBM Plex Sans:         weights 400, 500, 600, 700 — subset "latin" (Latin fallback glyphs)
IBM Plex Mono:          weight 500 — subset "latin" (digits/section numbers only)
```

---

## Summary

- **Visual direction:** "Paper & Ink" — warm Stone-scale neutrals, one restrained ink-navy brand
  color (`#1E4E6B`), no gradients, no purple — closer to Stripe docs/a law firm's letterhead than
  a generic AI SaaS landing page.
- **Hebrew-first typography:** IBM Plex Sans Hebrew + IBM Plex Sans (unified Hebrew/Latin family)
  for body copy, IBM Plex Mono specifically for law section numbers/page indicators/KPI numerals —
  a real, deliberate choice for mixed Hebrew/digit legibility, not a default.
- **Severity tokens are the frontend-developer's hard contract:** `severity-high/medium/low` (+
  `-bg` pairs) must be implemented exactly as specified in §3/§9, each with its own icon
  (`OctagonAlert`/`TriangleAlert`/`CircleAlert`) and label — color is never the sole signal, and
  all pairings are contrast-verified (5.3:1 to 8.4:1) in this document.
- **Category tokens** (`category-illegal/unfair/ambiguous`) use a disjoint hue family (violet/
  teal/stone) and an outlined-chip shape, deliberately distinct from `SeverityBadge`'s filled pill,
  so the two systems never visually collide when they co-occur on one `RedFlagCard`.
- **Print-safe disclaimer is the one place color is intentionally abandoned:** the `@media print`
  block (§6) forces black text on white with a bold 2pt black border, independent of the on-screen
  amber `DisclaimerCallout` styling — frontend-developer must implement this exact print CSS, not
  just reuse the screen styles, or D5 will silently fail on non-color/background-off printers.
- **D2 wording is unchanged** everywhere it appears (gate, footer, pre-print modal, print-only
  block) — this document only specifies container/color/type treatment around that fixed text.
