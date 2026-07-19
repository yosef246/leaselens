"use client";

/**
 * Forgot password — sends a reset link. The link returns via /auth/callback and lands on
 * /reset-password with a recovery session. We always show the same success message (don't
 * leak whether an email exists).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth/errors";
import { AuthCard } from "@/components/auth-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) {
      setError(translateAuthError(error));
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <AuthCard
        title="בדוק את המייל"
        footer={
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            חזרה להתחברות
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            אם הכתובת קיימת אצלנו, שלחנו אליה קישור לאיפוס הסיסמה.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="שכחתי סיסמה"
      subtitle="נשלח לך קישור לאיפוס הסיסמה"
      footer={
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          חזרה להתחברות
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            אימייל
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "שלח קישור איפוס"}
        </Button>
      </form>
    </AuthCard>
  );
}
