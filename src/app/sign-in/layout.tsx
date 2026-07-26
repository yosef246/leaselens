import type { Metadata } from "next";

// The page is a client component and can't export metadata itself. This server layout emits the
// noindex the robots.ts/sitemap.ts comments rely on: auth utility pages must be crawlable (so the
// tag is seen) but never indexed.
export const metadata: Metadata = {
  title: "התחברות",
  robots: { index: false, follow: true },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
