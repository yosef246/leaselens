/**
 * Map Supabase Auth errors to Hebrew, user-facing messages. Used by every auth page so the
 * user never sees a raw English Supabase message. Unknown errors get a generic message and
 * the original is logged to the console for debugging.
 */

const RULES: readonly [RegExp, string][] = [
  [/invalid login credentials/i, "אימייל או סיסמה שגויים"],
  [/email not confirmed/i, "צריך לאמת את האימייל קודם. שלחנו לך קישור."],
  [/user already registered|already registered/i, "המייל הזה כבר רשום. נסה להתחבר."],
  [/password should be at least 6/i, "הסיסמה חייבת להיות לפחות 6 תווים"],
  [/email rate limit exceeded|rate limit|too many requests/i, "שלחנו לך יותר מדי מיילים. חכה כמה דקות ונסה שוב."],
  [/signup requires a valid password/i, "צריך להזין סיסמה תקינה"],
  [/unable to validate email address|invalid format/i, "כתובת אימייל לא תקינה"],
];

export function translateAuthError(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");

  for (const [pattern, hebrew] of RULES) {
    if (pattern.test(message)) return hebrew;
  }

  console.error("[auth] untranslated error:", message);
  return "משהו השתבש. נסה שוב.";
}
