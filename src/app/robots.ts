import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Allow crawling of the public surface; block private/functional areas. Note: /sign-in, /sign-up
 * and /forgot-password are intentionally NOT disallowed — they carry a `noindex` meta tag, and a
 * crawler must be allowed to fetch a page in order to see (and honor) that tag.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/contracts", "/api", "/dev", "/auth"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
