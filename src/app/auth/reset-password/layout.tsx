import type { Metadata } from "next";

// Client page can't export metadata. /auth is already Disallow-ed in robots.ts, but a page that's
// blocked from crawling never has its noindex seen — so we emit noindex here as defense in depth.
export const metadata: Metadata = {
  title: "איפוס סיסמה",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
