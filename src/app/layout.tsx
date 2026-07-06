import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// NOTE (P0): scaffold fonts kept for bootstrap. The design system's Hebrew-first
// typography (IBM Plex Sans Hebrew + IBM Plex Sans + IBM Plex Mono) is wired in P4
// per docs/DESIGN_SYSTEM.md.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeaseLens",
  description: "ניתוח חוזי שכירות בעברית מול החוק הישראלי",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
