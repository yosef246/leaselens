import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CitedAnswer } from "@/components/cited-answer";
import { DEMO_ANSWER, DEMO_SOURCES, DEMO_CONTRACT_CLAUSES } from "@/lib/demo-data";

export default async function DemoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader authed={!!user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="secondary" className="mb-2">
              הדגמה — חוזה לדוגמה
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight">
              ״האם סעיף הפיקדון חוקי?״
            </h1>
          </div>
          <Button asChild>
            <Link href={user ? "/dashboard" : "/sign-in"}>נתח את החוזה שלך</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <CitedAnswer answer={DEMO_ANSWER} sources={DEMO_SOURCES} />

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">חוזה השכירות (קטע)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEMO_CONTRACT_CLAUSES.map((c) => (
                <div key={c.n} className="rounded-lg border border-border/60 p-3 text-sm">
                  <span className="font-semibold text-primary">סעיף {c.n}.</span> {c.text}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
