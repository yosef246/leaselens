import type { Metadata } from "next";

// Client page can't export metadata; this server layout carries the noindex the robots/sitemap
// comments assume for auth utility pages (crawlable so the tag is honored, never indexed).
export const metadata: Metadata = {
  title: "שחזור סיסמה",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
