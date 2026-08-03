import type { Metadata } from "next";
import Link from "next/link";
import { Scale, Search, Quote, Upload, Sparkles, MessageSquareText } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthCta } from "@/components/auth-cta";
import { JsonLd } from "@/components/json-ld";
import { TrustBadges } from "@/components/marketing/trust-badges";
import { Comparison } from "@/components/marketing/comparison";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { FAQ_JSONLD } from "@/lib/faq";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Static marketing page — no request-time data; auth-aware CTAs resolve on the client.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "ניתוח חוזי שכירות מול החוק הישראלי — בעברית, בשניות",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: Search,
    title: "חיפוש היברידי חכם",
    body: "vector + keyword לדיוק מקסימלי בעברית — גם כשאתה שואל ב״פיקדון״ והחוק אומר ״ערובה״.",
  },
  {
    icon: Quote,
    title: "ציטוטים אמיתיים",
    body: "כל תשובה מגובה בסעיף מדויק — גם בחוזה שלך וגם בחוק. בלי המצאות.",
  },
  {
    icon: Scale,
    title: "חוק ישראלי מובנה",
    body: "חוק השכירות והשאילה, שכירות הוגנת, הגנת הדייר ועוד — הניתוח מעוגן בחקיקה.",
  },
];

const STEPS = [
  { icon: Upload, title: "מעלים את החוזה", body: "גוררים PDF של חוזה השכירות. הטקסט מחולץ ומפורסר אוטומטית." },
  { icon: Sparkles, title: "השופט מנתח", body: "החוזה נשלף מול קורפוס החוק הישראלי, וסעיפים בעייתיים מסומנים." },
  { icon: MessageSquareText, title: "מקבלים חוזה מתוקן", body: "מאשרים תיקונים ומורידים PDF של חוזה מתוקן, מוכן לחתימה." },
];

function HeroMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/15 to-transparent blur-3xl" />
      <Card className="shadow-2xl ring-1 ring-border/60">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              האם סעיף הפיקדון חוקי?
            </span>
          </div>
          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              החוק קובע תקרה לגובה הערובה — לא יותר מהנמוך מבין שליש מדמי השכירות או שלושה חודשי
              שכירות{" "}
              <span className="rounded bg-chart-2/15 px-1 font-mono text-xs text-chart-2">[1]</span>.
              בחוזה שלך נקבעה ערובה של 10,000 ₪{" "}
              <span className="rounded bg-primary/15 px-1 font-mono text-xs text-primary">[א]</span>.
            </p>
            <p className="text-muted-foreground">
              מומלץ להשוות מול דמי השכירות החודשיים כדי לוודא שאינה חורגת מהתקרה.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
            <span className="inline-flex items-center gap-1 rounded-md bg-chart-2/10 px-2 py-1 text-xs text-chart-2">
              <span className="font-mono">[1]</span> חוק השכירות §25י
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
              <span className="font-mono">[א]</span> סעיף 4 בחוזה
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const SOFTWARE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "he-IL",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={[SOFTWARE_SCHEMA, FAQ_JSONLD]} />
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 overflow-hidden px-4 py-16 sm:gap-14 sm:px-6 sm:py-24 md:grid-cols-2 md:py-32">
          <div className="text-center md:text-right">
            <Badge variant="secondary" className="mb-5">
              מבוסס AI · חוק ישראלי · עברית
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
              דע בדיוק על מה{" "}
              <span className="text-primary">אתה חותם</span>
            </h1>
            <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-muted-foreground md:mx-0 md:text-xl">
              העלה חוזה שכירות, וקבל תוך דקות ניתוח מבוסס-ציטוטים מהחוק — וחוזה מתוקן מוכן לחתימה.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Button asChild size="xl" className="w-full sm:w-auto">
                <Link href="/demo">נסה עם חוזה דוגמה</Link>
              </Button>
              <AuthCta
                size="xl"
                variant="outline"
                className="w-full sm:w-auto"
                guestLabel="התחל עכשיו"
                authedLabel="לדשבורד"
              />
            </div>
          </div>
          <HeroMockup />
        </section>

        {/* Trust badges */}
        <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <TrustBadges />
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="h-full border-border/60">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="pt-3 text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-[15px] leading-relaxed text-muted-foreground">
                  {f.body}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border/60 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <h2 className="mb-14 text-center text-3xl font-bold tracking-tight sm:text-4xl">איך זה עובד</h2>
            <div className="grid gap-10 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.title} className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <s.icon className="h-8 w-8" />
                  </div>
                  <div className="mt-5 flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{i + 1}</span>
                    <h3 className="text-lg font-semibold">{s.title}</h3>
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            למה לא סתם לחתום?
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-lg text-muted-foreground">
            ההבדל בין לחתום על מסמך שלא הבנת — לבין להיכנס לחוזה בידיים פתוחות.
          </p>
          <Comparison />
        </section>

        {/* FAQ */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
            <h2 className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl">
              שאלות נפוצות
            </h2>
            <div className="rounded-2xl border border-border/60 bg-card px-6 shadow-sm sm:px-8">
              <FaqAccordion />
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              לא מצאת תשובה?{" "}
              <Link href="/faq" className="font-medium text-primary hover:underline">
                לכל השאלות
              </Link>
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">מוכן לבדוק את החוזה שלך?</h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            התחל עם חוזה דוגמה, או העלה את החוזה שלך עכשיו.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="xl" className="w-full sm:w-auto">
              <Link href="/demo">נסה עם חוזה דוגמה</Link>
            </Button>
            <AuthCta
              size="xl"
              variant="outline"
              className="w-full sm:w-auto"
              guestLabel="התחל עכשיו"
              authedLabel="לדשבורד"
            />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
