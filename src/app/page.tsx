import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listContracts } from "@/lib/db/contracts";
import { ContractUploader } from "@/components/contract-uploader";
import { ContractList } from "@/components/contract-list";

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
        <ContractList contracts={contracts} />
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
