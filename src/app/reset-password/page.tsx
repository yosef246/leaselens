"use client";

/**
 * Reset password — reached from the email link (via /auth/callback, which establishes a
 * recovery session). Sets a new password with updateUser, then goes to /dashboard.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // The recovery link must have established a session; if not, the link is invalid/expired.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setHasSession(!!data.user));
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
    toast.success("הסיסמה עודכנה");
    router.push("/dashboard");
    router.refresh();
  }

  if (hasSession === false) {
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

        <Button type="submit" className="w-full" disabled={loading || hasSession === null}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "עדכן סיסמה"}
        </Button>
      </form>
    </AuthCard>
  );
}
