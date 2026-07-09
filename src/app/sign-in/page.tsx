"use client";

/**
 * Sign-in page — Supabase Auth UI with Google OAuth + email/password.
 * Public route (allowed by updateSession's PUBLIC_PREFIXES). On success the session
 * cookie is set (Google → /auth/callback → exchange; email/password → set directly),
 * and the middleware stops redirecting.
 */
import { useEffect, useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const supabase = createClient();
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);

  // window is only available client-side; build the OAuth return URL after mount.
  useEffect(() => {
    setRedirectTo(`${window.location.origin}/auth/callback`);
  }, []);

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
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
          appearance={{ theme: ThemeSupa }}
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
