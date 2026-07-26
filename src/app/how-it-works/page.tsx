import type { Metadata } from "next";
import Link from "next/link";
import { Upload, Sparkles, MessageSquareText } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { AuthCta } from "@/components/auth-cta";
import { SITE_URL } from "@/lib/site";
import { Button } from "@/components/ui/button";

// Static marketing page — no request-time data.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "איך זה עובד",
  description:
    "כך בודקים חוזה שכירות ב-LeaseLens בשלושה צעדים: מעלים PDF, המערכת מנתחת מול החוק הישראלי, ושואלים שאלות בעברית — עם תשובות מצוטטות.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS = [
  {
    icon: Upload,
    title: "מעלים את החוזה",
    body: "גוררים PDF של חוזה השכירות. הטקסט מחולץ ומפורסר אוטומטית, ומחולק לקטעים לצורך ניתוח.",
  },
  {
    icon: Sparkles,
    title: "המערכת מנתחת",
    body: "כל קטע מוטמע ונשלף מול קורפוס החוק הישראלי בחיפוש היברידי, ומודל שפה מזהה סעיפים חריגים.",
  },
  {
    icon: MessageSquareText,
    title: "שואלים בעברית",
    body: "״האם סעיף הפיקדון חוקי?״ — ומקבלים תשובה מצוטטת, עם הפניה לסעיף בחוזה ולסעיף בחוק.",
  },
];

// HowTo structured data — grounded in the same three steps shown on the page (AEO).
const HOWTO_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "איך בודקים חוזה שכירות מול החוק הישראלי ב-LeaseLens",
  inLanguage: "he-IL",
  url: `${SITE_URL}/how-it-works`,
  step: STEPS.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.title,
    text: s.body,
  })),
};

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={HOWTO_SCHEMA} />
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">איך זה עובד</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          משלושה צעדים ועד ניתוח משפטי מבוסס-ציטוטים — בעברית, בשניות.
        </p>

        <ol className="mt-12 space-y-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">{i + 1}</span>
                  <h2 className="text-lg font-semibold">{s.title}</h2>
                </div>
                <p className="mt-1 leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/demo">נסה עם חוזה דוגמה</Link>
          </Button>
          <AuthCta size="lg" variant="outline" guestLabel="התחבר והעלה חוזה" authedLabel="לדשבורד" />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
