import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listContracts } from "@/lib/db/contracts";
import { ContractUploader } from "@/components/contract-uploader";

const STATUS_LABEL: Record<string, string> = {
  uploaded: "הועלה",
  parsing: "מפרסר",
  parsed: "פורסר",
  embedded: "מוטמע",
  failed: "נכשל",
};

export default async function Home() {
  // Middleware already guarantees a session here; read it to show who's signed in.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const contracts = user ? await listContracts(user.id) : [];

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 bg-stone-50 p-8">
      <div className="text-center">
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

      <ContractUploader />

      <section className="w-full max-w-md">
        <h2 className="mb-3 text-lg font-medium text-stone-900">החוזים שלי</h2>
        {contracts.length === 0 ? (
          <p className="text-sm text-stone-500">עדיין לא הועלו חוזים.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {contracts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="truncate font-medium text-stone-900">{c.title}</span>
                <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="max-w-md text-center text-sm text-stone-500">
        דף הפיתוח:{" "}
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
