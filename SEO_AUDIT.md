# SEO / AEO / Site-Health Audit — LeaseLens

_Run: 2026-07-26 · by seo-aeo-engineer methodology · against production `next build` (exit 0)._

## Summary
- **Rendering model:** Next.js 15 App Router. Marketing pages static/SSR with server-emitted
  metadata + JSON-LD (crawlable HTML). App pages server-rendered on demand, `noindex`.
- **Findings:** 0 critical, 0 high, 3 medium, 2 low. **Fixed: 7** (SEO-001–004, 007 + the SiteHeader
  regression). **Accepted/deferred: 1** (SEO-006 — unfixable in current Next version, benign).
- **Overall: launch-ready.** No blocking SEO/AEO defect. Remaining items are performance/TTFB
  optimizations and owner-side external setup — none prevent correct indexing or answer-inclusion.

---

## Technical SEO

All indexing/crawl findings from the first pass were **fixed and verified in this build**:

| ID | Page / File | Issue | Sev | Status |
|----|-------------|-------|-----|--------|
| SEO-001 | `sign-in`, `sign-up`, `forgot-password` | Client pages couldn't emit `noindex`; robots/sitemap comments **claimed** noindex that didn't exist → pages were indexable | high | **FIXED** — co-located server `layout.tsx` emits `robots: index:false, follow:true` |
| SEO-002 | `auth/reset-password` | Same, under already-Disallowed `/auth` (blocked page's noindex is never seen) | med | **FIXED** — `layout.tsx` emits `noindex,nofollow` (defense in depth) |
| SEO-003 | `dashboard`, `contracts/[id]`, `dev` | Private/server pages relied only on robots `Disallow`; no page-level `noindex` | med | **FIXED** — `export const metadata = { robots: index:false }` on each |
| SEO-004 | `demo/page.tsx` | Listed in sitemap (priority 0.8) but had **no metadata and no canonical** — inherited default title | high | **FIXED** — title + answer-phrased description + `alternates.canonical: "/demo"` |

**Verified consistent (no action needed):**
- `robots.txt` Disallows exactly the private surface (`/dashboard`, `/contracts`, `/api`, `/dev`, `/auth`);
  auth utility pages are intentionally crawlable so their `noindex` is honored. ✅
- `sitemap.xml` lists only indexable URLs (`/`, `/demo`). No `noindex` URL leaks into the sitemap. ✅
- Canonicals present on both indexable pages (`/` and `/demo`). ✅
- `metadataBase` set to the canonical origin → all OG/canonical URLs resolve absolute. ✅
- No broken internal links: every `href` target (`/`, `/dashboard`, `/demo`, `/forgot-password`,
  `/sign-in`, `/sign-up`) resolves to a real route. ✅
- Proper 404 (`app/not-found.tsx`). ✅ No hardcoded localhost/preview URLs in source. ✅

---

## AEO / Structured Data

| Schema | Location | Status |
|--------|----------|--------|
| `Organization` + `WebSite` | `layout.tsx` (site-wide) | ✅ valid, `inLanguage: he-IL` |
| `SoftwareApplication` + `FAQPage` | `page.tsx` (landing) | ✅ FAQ answers mirror the visible `<dl>` FAQ section |
| `QAPage` | `demo/page.tsx` | ✅ **added** — single genuine question + grounded cited answer; text mirrors the on-page `<h1>` and `CitedAnswer` |

- All JSON-LD **matches visible page content** (Google's requirement) — no schema-only claims.
- No fabricated `AggregateRating`/review schema (correctly avoided — would risk manual action).
- Answer-first structure in place: FAQ uses semantic `<dl>/<dt>/<dd>`; `/demo` leads with the
  question as `<h1>` and a concise cited answer directly beneath — the shape AI answer engines extract.
- Locale correct throughout: `<html lang="he" dir="rtl">`, `og:locale: he_IL`, `inLanguage: he-IL`.
- **Gap (low, SEO-005):** no `BreadcrumbList` on `/demo`. Low value for a 2-level site; defer.

---

## Web / Site Health

**Build is green (exit 0), 19 routes generated.** Levers observed:

| ID | Finding | Sev | Disposition |
|----|---------|-----|-------------|
| SEO-006 | **Edge Runtime warning:** `@supabase/supabase-js` uses `process.version`, unsupported in Edge Runtime, pulled in via `src/lib/supabase/middleware.ts`. Compiles with a warning and works. | med | **ACCEPTED / deferred.** Attempted the real fix — Node.js middleware runtime (`experimental.nodeMiddleware` + `runtime:"nodejs"`) — but it is **not supported in Next 15.5.20** (build fails: unrecognized experimental key). Reverted. The warning is benign (universal to the Supabase SSR middleware pattern) and does not affect runtime. Revisit after a Next upgrade that stabilizes Node middleware. |
| SEO-007 | **Session middleware ran on public marketing routes.** `updateSession` executed a Supabase `getUser()` round-trip on `/` and `/demo` too — adding per-request TTFB to the exact pages that carry the SEO/AEO weight, which don't need an auth-cookie refresh. | med | **FIXED** — `updateSession` now computes `isPublic` first and early-returns `NextResponse.next()` for public prefixes, skipping the Supabase round-trip entirely on `/` and `/demo`. Guard behavior for protected routes is unchanged. Build green, typecheck clean. |
| SEO-008 | **Public First Load JS ~257–258 kB** (`/` and `/demo`). Above the ~170 kB comfort zone for marketing pages; affects LCP on slow mobile. Driven by hydrating `ThemeProvider`/`AuthCta`/`ModeToggle` on otherwise-static content. | low | Optional. Acceptable for a portfolio app; revisit only if CWV field data flags LCP. |

**Confirmed healthy:**
- Font: `next/font` Assistant with `display: swap` + Hebrew+Latin subsets — no FOIT, no external font request. ✅
- One `<h1>` per public page; logical heading order. ✅
- No raw `<img>`; iconography is inline SVG (lucide) with decorative emoji `aria-hidden`. No missing `alt`. ✅
- OG/Twitter: `summary_large_image` + file-convention `opengraph-image` (1200×630) → Next auto-populates both `og:image` and `twitter:image`. ✅
- PWA `manifest.webmanifest`, `theme-color` (light/dark), viewport all present. ✅

---

## Fixes Applied (this workstream)
1. `src/app/sign-in/layout.tsx` — new, `noindex` + title.
2. `src/app/sign-up/layout.tsx` — new, `noindex` + title.
3. `src/app/forgot-password/layout.tsx` — new, `noindex` + title.
4. `src/app/auth/reset-password/layout.tsx` — new, `noindex,nofollow` + title.
5. `src/app/dashboard/page.tsx`, `src/app/contracts/[id]/page.tsx`, `src/app/dev/page.tsx` — `noindex` metadata.
6. `src/app/demo/page.tsx` — metadata + canonical + `QAPage` JSON-LD; also fixed a stale
   `SiteHeader authed=` prop left by the header refactor (typecheck now clean).

## Referred Out
- **SEO-006** (Supabase Edge Runtime warning) — accepted/deferred (see table). Re-evaluate on the
  next Next.js upgrade that ships stable Node middleware.

## Recommended Next (owner action — external, can't be done in-repo)
- **Google Search Console:** verify the domain, submit `sitemap.xml`, watch Coverage + Core Web Vitals.
- **`NEXT_PUBLIC_SITE_URL`:** set to the permanent production domain (currently falls back to the
  Vercel deployment URL) so canonicals/OG don't point at a preview host.
- **Real OG image:** current default is a minimal Latin graphic; a product screenshot lifts CTR.
- **Analytics (PostHog):** planned in architecture (P7) but not wired — needed for real CWV field data.
