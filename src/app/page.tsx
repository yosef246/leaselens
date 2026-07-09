import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // Middleware already guarantees a session here; read it to show who's signed in.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-stone-50 p-8 text-center">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
          LeaseLens
        </h1>
        <p className="mt-2 text-stone-600">
          ניתוח חוזי שכירות בעברית מול החוק הישראלי
        </p>
      </div>

      {user && (
        <div className="flex items-center gap-3 text-sm text-stone-600">
          <span>מחובר כ־{user.email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-stone-300 px-3 py-1 font-medium text-stone-900 hover:bg-stone-100"
            >
              התנתקות
            </button>
          </form>
        </div>
      )}

      <p className="max-w-md text-sm text-stone-500">
        הפרויקט בבנייה — שלב P0 הושלם. דף הפיתוח:{" "}
        <Link
          href="/dev"
          className="font-medium text-stone-900 underline underline-offset-4"
        >
          /dev
        </Link>
      </p>
    </main>
  );
}
