"use client";

/**
 * Sign-in page — Supabase Auth UI with Google OAuth + email/password.
 * Public route (allowed by updateSession's PUBLIC_PREFIXES). On success the session
 * cookie is set (Google → /auth/callback → exchange; email/password → set directly),
 * and the middleware stops redirecting.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  // createClient() is cheap but returns a new instance each render; memoize so the
  // onAuthStateChange subscription below has a stable client across re-renders.
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);

  // window is only available client-side; build the OAuth return URL after mount.
  useEffect(() => {
    setRedirectTo(`${window.location.origin}/auth/callback`);
  }, []);

  // After email/password sign-up or sign-in the browser client sets the session cookie
  // but doesn't navigate. Push to / on SIGNED_IN; refresh() so middleware + server
  // components pick up the new session. (Google goes through /auth/callback instead.)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/dashboard");
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <main
      dir="rtl"
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <Link
        href="/"
        className="absolute right-6 top-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        <span>חזרה לדף הבית</span>
      </Link>

      <div style={{ width: "100%", maxWidth: 400 }}>
        <h1 style={{ textAlign: "center", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          LeaseLens
        </h1>
        <p style={{ textAlign: "center", opacity: 0.7, marginBottom: "1.5rem" }}>
          התחברות לניתוח חוזי שכירות
        </p>
        <Auth
          supabaseClient={supabase}
          providers={["google"]}
          redirectTo={redirectTo}
          appearance={{
            theme: ThemeSupa,
            // Explicit dark inputs so typed text is always readable (was black-on-dark).
            style: {
              // fontSize 16px stops iOS Safari from zooming in on focus.
              input: { color: "#ffffff", backgroundColor: "#1c1917", fontSize: "16px" },
              label: { color: "#44403c" },
            },
            variables: {
              default: {
                colors: {
                  inputText: "#ffffff",
                  inputBackground: "#1c1917",
                  inputBorder: "#44403c",
                  inputPlaceholder: "#a8a29e",
                },
              },
            },
          }}
          localization={{
            variables: {
              sign_in: {
                email_label: "אימייל",
                password_label: "סיסמה",
                email_input_placeholder: "האימייל שלך",
                password_input_placeholder: "הסיסמה שלך",
                button_label: "התחברות",
                social_provider_text: "המשך עם {{provider}}",
                link_text: "כבר יש לך חשבון? התחבר",
              },
              sign_up: {
                email_label: "אימייל",
                password_label: "סיסמה",
                email_input_placeholder: "האימייל שלך",
                password_input_placeholder: "בחר סיסמה",
                button_label: "הרשמה",
                social_provider_text: "המשך עם {{provider}}",
                link_text: "אין לך חשבון? הירשם",
              },
            },
          }}
        />
      </div>
    </main>
  );
}
