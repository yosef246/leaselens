import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FAQ_JSONLD } from "@/lib/faq";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "שאלות נפוצות",
  description:
    "שאלות ותשובות על LeaseLens: תוקף משפטי, פרטיות ומחיקת החוזה, מחיר, הורדת דו״ח לעורך דין, ועל אילו חוזים המערכת עובדת.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={FAQ_JSONLD} />
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">שאלות נפוצות</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          כל מה שחשוב לדעת לפני שמעלים חוזה — תוקף, פרטיות, מחיר ותחולה.
        </p>

        <div className="mt-10 rounded-2xl border border-border/60 bg-card px-6 shadow-sm sm:px-8">
          <FaqAccordion />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
