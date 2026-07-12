import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

// Hebrew-first variable font (also covers Latin), wired as the default sans via globals.css.
const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LeaseLens — ניתוח חוזי שכירות מול החוק הישראלי",
  description:
    "העלה חוזה שכירות וקבל ניתוח משפטי מבוסס-ציטוטים מהחוק הישראלי — בעברית, בשניות.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "LeaseLens — ניתוח חוזי שכירות מול החוק הישראלי",
    description:
      "ניתוח RAG של חוזי שכירות מול חוק השכירות, החוזים האחידים והמקרקעין — עם ציטוטים מדויקים.",
    locale: "he_IL",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${assistant.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-center" dir="rtl" />
        </ThemeProvider>
      </body>
    </html>
  );
}
