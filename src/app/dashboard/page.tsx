import { createClient } from "@/lib/supabase/server";
import { listContracts } from "@/lib/db/contracts";
import { ContractUploader } from "@/components/contract-uploader";
import { ContractList } from "@/components/contract-list";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const contracts = user ? await listContracts(user.id) : [];

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader email={user?.email} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">החוזים שלי</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            העלה חוזה שכירות כדי לנתח אותו מול החוק הישראלי.
          </p>
        </div>

        <ContractUploader />

        <section className="mt-10">
          <ContractList contracts={contracts} />
        </section>
      </main>
    </div>
  );
}
