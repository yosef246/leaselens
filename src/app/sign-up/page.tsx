"use client";

/**
 * Sign up — custom email/password form + Google OAuth. If the project requires email
 * confirmation, we show a "check your inbox" state; otherwise we go straight to /dashboard.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth/errors";
import { AuthCard } from "@/components/auth-card";
import { GoogleButton } from "@/components/google-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(translateAuthError(error));
      setLoading(false);
      return;
    }
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    // No session → email confirmation required.
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <AuthCard
        title="כמעט שם!"
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
            שלחנו קישור אימות לכתובת <span className="font-medium text-foreground">{email}</span>.
            לחץ עליו כדי להשלים את ההרשמה.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="הרשמה"
      subtitle="צור חשבון כדי לנתח את החוזה שלך"
      footer={
        <>
          כבר יש לך חשבון?{" "}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            התחבר
          </Link>
        </>
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

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            סיסמה
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="לפחות 6 תווים"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "הרשמה"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        או
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton label="הרשמה עם Google" />
    </AuthCard>
  );
}
