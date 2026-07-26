import type { Metadata } from "next";
import { Scale, ShieldCheck, Quote } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Static marketing page — no request-time data.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "אודות LeaseLens",
  description:
    "LeaseLens מנתחת חוזי שכירות מול החוק הישראלי — מבוססת RAG, עם ציטוטים מדויקים מהחוזה ומהחוק, בעברית. הכירו את המוצר, העקרונות והטכנולוגיה.",
  alternates: { canonical: "/about" },
};

const ABOUT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `אודות ${SITE_NAME}`,
  url: `${SITE_URL}/about`,
  inLanguage: "he-IL",
  about: { "@type": "SoftwareApplication", name: SITE_NAME, applicationCategory: "BusinessApplication" },
};

const PRINCIPLES = [
  {
    icon: Quote,
    title: "ציטוטים בלבד",
    body: "כל תשובה מגובה בסעיף מדויק — בחוזה ובחוק. כשאין מידע ודאי, המערכת אומרת זאת במפורש במקום לנחש.",
  },
  {
    icon: Scale,
    title: "חוק ישראלי מובנה",
    body: "קורפוס של חוקי השכירות, החוזים האחידים, המקרקעין והגנת הדייר — מוטמע ונשלף בזמן אמת מול החוזה שלך.",
  },
  {
    icon: ShieldCheck,
    title: "פרטיות מובנית",
    body: "כל חוזה נשמר תחת החשבון שלך בלבד, עם בידוד ברמת השורה (RLS) בבסיס הנתונים.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={ABOUT_SCHEMA} />
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">אודות LeaseLens</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          LeaseLens נולדה מתוך פער פשוט: רוב השוכרים בישראל חותמים על חוזה שכירות בלי לדעת אילו
          סעיפים בו חורגים מהחוק. המערכת קוראת את החוזה שלך, משווה אותו מול קורפוס החוק הישראלי,
          ומחזירה ניתוח בעברית — עם הפניה מדויקת לסעיף בחוזה ולסעיף בחוק.
        </p>

        <h2 className="mt-12 text-2xl font-bold tracking-tight">איך זה בנוי</h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          בלב המערכת עומד חיפוש היברידי (vector + keyword) המותאם לעברית — כך שאלה על ״פיקדון״
          מוצאת גם סעיפים שמנוסחים כ״ערובה״. מודל שפה מנתח כל קטע רלוונטי מול הסעיפים שנשלפו,
          ומייצר תשובה מצוטטת שמאומתת מכנית מול המקור לפני שהיא מוצגת.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <Card key={p.title} className="h-full">
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <p.icon className="h-6 w-6" />
                </div>
                <CardTitle className="pt-2 text-base">{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{p.body}</CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-12 rounded-lg border border-border/60 bg-muted/40 p-5 text-sm leading-relaxed text-muted-foreground">
          LeaseLens היא כלי מידע ואינה מהווה ייעוץ משפטי. לקבלת חוות דעת מחייבת יש לפנות לעורך דין.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
