/**
 * Canonical site identity — the single source of truth for the origin, name, and default
 * description used across metadata, sitemap, robots, manifest, and OG image generation.
 *
 * Override the origin per-environment with NEXT_PUBLIC_SITE_URL (e.g. a custom domain);
 * otherwise we fall back to the current Vercel deployment.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://leaselens-delta.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "LeaseLens";

/** Default meta description (~155 chars) — phrased as a direct answer for AEO, with keywords. */
export const SITE_DESCRIPTION =
  "LeaseLens מנתחת חוזי שכירות מול החוק הישראלי ומחזירה תשובות מצוטטות בעברית. בדיקת חוזה שכירות מול חוק השכירות, החוזים האחידים והמקרקעין — בשניות.";

export const SITE_KEYWORDS = [
  "חוזה שכירות",
  "ניתוח חוזה",
  "בדיקת חוזה שכירות",
  "חוק השכירות",
  "ניתוח חוזה שכירות",
  "זכויות שוכר",
];
