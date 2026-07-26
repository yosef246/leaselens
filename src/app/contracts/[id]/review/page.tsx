import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContract } from "@/lib/db/contracts";
import { listContractIssues } from "@/lib/db/contract-issues";
import { DashboardHeader } from "@/components/dashboard-header";
import { IssuesReview } from "@/components/issues-review";

// Private, per-user area — never indexed.
export const metadata = { robots: { index: false, follow: false } };

export default async function ContractReviewPage({
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

  const issues = await listContractIssues(user.id, id);

  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardHeader email={user.email} />
      <IssuesReview
        contractId={id}
        title={contract.title}
        status={contract.status}
        initialIssues={issues}
      />
    </div>
  );
}
