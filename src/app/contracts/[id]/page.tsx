import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContract } from "@/lib/db/contracts";
import { listContractChunks } from "@/lib/db/contract-chunks";
import { DashboardHeader } from "@/components/dashboard-header";
import { ResultsView } from "@/components/results-view";

export default async function ContractResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound(); // middleware guards; defensive.

  const contract = await getContract(user.id, id);
  if (!contract) notFound();

  const chunks = await listContractChunks(user.id, id);

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader email={user.email} />
      <ResultsView
        contractId={id}
        title={contract.title}
        status={contract.status}
        chunks={chunks}
      />
    </div>
  );
}
