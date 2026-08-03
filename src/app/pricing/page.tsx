import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthCta } from "@/components/auth-cta";
import { PRICE_ILS } from "@/lib/faq";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "מחיר — סריקה ראשונה חינם",
  description: `בדיקת חוזה שכירות ב-LeaseLens: סריקה ראשונה חינם, אחר כך ${PRICE_ILS} ₪ לסריקה. בלי מנוי, בלי הפתעות.`,
  alternates: { canonical: "/pricing" },
};

const INCLUDED = [
  "זיהוי סעיפים בעייתיים, חד-צדדיים ולא-חוקיים",
  "הסבר בעברית פשוטה + הפניה לסעיף החוק",
  "הצעת ניסוח מתוקן לכל סעיף",
  "חוזה מתוקן להורדה כ-PDF",
  "צ׳אט על החוזה — תשובות מצוטטות",
];

export default function PricingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center sm:px-6 sm:py-24">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">מחיר פשוט והוגן</h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
          הסריקה הראשונה חינם. אין מנוי, אין התחייבות — משלמים רק כשצריך.
        </p>

        <div className="mx-auto mt-12 max-w-md rounded-3xl border border-primary/30 bg-primary/[0.04] p-8 text-right shadow-sm sm:p-10">
          <p className="text-sm font-medium text-primary">סריקה ראשונה</p>
          <div className="mt-1 flex items-baseline justify-end gap-2">
            <span className="text-5xl font-extrabold tracking-tight">חינם</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            לאחר מכן {PRICE_ILS} ₪ לכל סריקה נוספת — תשלום חד-פעמי, לא מנוי.
          </p>

          <ul className="mt-8 space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-[15px] leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <AuthCta
              size="xl"
              className="w-full"
              guestLabel="התחל סריקה חינם"
              authedLabel="לדשבורד"
            />
          </div>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          רוצה לראות איך זה נראה קודם?{" "}
          <Link href="/demo" className="font-medium text-primary hover:underline">
            נסה עם חוזה דוגמה
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
