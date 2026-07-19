import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Shared layout for every auth page: centered card, brand, back-to-home link, title/subtitle. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main dir="rtl" className="relative flex min-h-dvh items-center justify-center p-6">
      <Link
        href="/"
        className="absolute right-6 top-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        <span>חזרה לדף הבית</span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-extrabold tracking-tight">
          <span aria-hidden>📋</span>
          <span>LeaseLens</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{title}</CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>

        {footer && <p className="mt-4 text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </main>
  );
}
