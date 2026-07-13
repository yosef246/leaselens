import Link from "next/link";
import { Scale, Search, Quote, Upload, Sparkles, MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Search,
    title: "Hybrid RAG",
    body: "חיפוש vector + keyword לדיוק מקסימלי בעברית — גם כשאתה שואל ב״פיקדון״ והחוק אומר ״ערובה״.",
  },
  {
    icon: Quote,
    title: "ציטוטים אמיתיים",
    body: "כל תשובה מגובה בסעיף מדויק — גם בחוזה שלך וגם בחוק. בלי המצאות.",
  },
  {
    icon: Scale,
    title: "חוק ישראלי מובנה",
    body: "חוק השכירות והשאילה, החוזים האחידים, המקרקעין, הגנת הדייר ועוד — 11 חוקים.",
  },
];

const STEPS = [
  { icon: Upload, title: "העלה חוזה", body: "גרור PDF של חוזה השכירות. הטקסט מחולץ ומפורסר אוטומטית." },
  { icon: Sparkles, title: "המערכת מנתחת", body: "החוזה מוטמע ונשלף מול קורפוס החוק הישראלי." },
  { icon: MessageSquareText, title: "שאל בעברית", body: "״האם סעיף הפיקדון חוקי?״ — קבל תשובה מצוטטת בשניות." },
];

function HeroMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/15 to-transparent blur-2xl" />
      <Card className="shadow-xl ring-1 ring-border/60">
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
            <span className="inline-flex items-center rounded-md border border-amber-500/40 px-2 py-1 text-xs text-amber-600 dark:text-amber-400">
              keyword
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authed = !!user;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader authed={authed} />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 overflow-hidden px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div className="text-center md:text-right">
            <Badge variant="secondary" className="mb-4">
              מבוסס RAG · חוק ישראלי · עברית
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              נתח חוזי שכירות מול החוק הישראלי —{" "}
              <span className="text-primary">ב-30 שניות</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              העלה חוזה, וקבל ניתוח משפטי מבוסס-ציטוטים מהחוק — בעברית.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/demo">נסה עם חוזה דוגמה</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href={authed ? "/dashboard" : "/sign-in"}>
                  {authed ? "לדשבורד" : "התחבר"}
                </Link>
              </Button>
            </div>
          </div>
          <HeroMockup />
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="h-full">
                <CardHeader>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="pt-2">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{f.body}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight">איך זה עובד</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <s.icon className="h-7 w-7" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">{i + 1}</span>
                  <h3 className="font-semibold">{s.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
