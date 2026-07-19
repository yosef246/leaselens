"use client";

/**
 * Login — custom email/password form + Google OAuth, styled in the app's design language.
 * Public route (middleware PUBLIC_PREFIXES). On success, navigate to /dashboard.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth/errors";
import { AuthCard } from "@/components/auth-card";
import { GoogleButton } from "@/components/google-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show a toast after signing out (redirected here with ?signedout=1), then clean the URL.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("signedout") === "1") {
      toast.success("התנתקת בהצלחה");
      window.history.replaceState(null, "", "/sign-in");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(translateAuthError(error));
      setLoading(false);
      return;
    }
    // Sonner's Toaster lives in the root layout, so this toast survives the client navigation.
    toast.success("התחברת בהצלחה");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard
      title="התחברות"
      subtitle="נתח את חוזי השכירות שלך מול החוק"
      footer={
        <>
          אין לך חשבון?{" "}
          <Link href="/sign-up" className="font-medium text-primary hover:underline">
            הירשם
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
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              סיסמה
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              שכחתי סיסמה
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "התחברות"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        או
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton />
    </AuthCard>
  );
}
