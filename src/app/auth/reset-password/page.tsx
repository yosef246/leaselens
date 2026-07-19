"use client";

/**
 * Reset password — the recovery email link lands here directly. Supabase delivers the
 * recovery token in the URL hash (#access_token=…&refresh_token=…&type=recovery). The browser
 * client's detectSessionInUrl consumes it and fires PASSWORD_RECOVERY/SIGNED_IN; we wait for
 * that session, then updateUser({ password }). On success we sign out and send the user to
 * /sign-in so they log in with the new password.
 *
 * Public route (covered by the "/auth" prefix in middleware) — the hash never reaches the
 * server, so the guard must not redirect before the client can process it.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth/errors";
import { AuthCard } from "@/components/auth-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");

  // Wait for the recovery session established from the URL hash.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setStatus("ready");
    });

    // Fallback: the client may have consumed the hash before this effect ran.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus("ready");
    });

    // If nothing established a session, the link is invalid/expired.
    const timer = setTimeout(() => {
      setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 2500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("הסיסמאות אינן תואמות");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(translateAuthError(error));
      setLoading(false);
      return;
    }
    // Force a fresh login with the new password.
    await supabase.auth.signOut();
    router.push("/sign-in?reset=1");
  }

  if (status === "invalid") {
    return (
      <AuthCard
        title="הקישור אינו תקף"
        footer={
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            שלח קישור חדש
          </Link>
        }
      >
        <p className="py-2 text-center text-sm text-muted-foreground">
          קישור איפוס הסיסמה פג או שכבר נעשה בו שימוש. בקש קישור חדש.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="בחירת סיסמה חדשה" subtitle="הזן סיסמה חדשה לחשבון שלך">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            סיסמה חדשה
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

        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">
            אימות סיסמה
          </label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            dir="ltr"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="הקלד שוב"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading || status !== "ready"}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "checking" ? (
            "מאמת קישור…"
          ) : (
            "עדכן סיסמה"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
