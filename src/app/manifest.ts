import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

/** Minimal PWA manifest (installability + rich share/OS integration). RTL, Hebrew-first. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ניתוח חוזי שכירות מול החוק`,
    short_name: SITE_NAME,
    description: "ניתוח חוזי שכירות מול החוק הישראלי, עם ציטוטים מדויקים — בעברית.",
    start_url: "/",
    display: "standalone",
    lang: "he",
    dir: "rtl",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
