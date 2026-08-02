import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContract } from "@/lib/db/contracts";
import { listContractIssues } from "@/lib/db/contract-issues";
import { countChunksForContract } from "@/lib/db/contract-chunks";
import { MAX_REVIEW_SECTIONS } from "@/lib/ai/issue-detection";
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

  const [issues, totalSections] = await Promise.all([
    listContractIssues(user.id, id),
    countChunksForContract(user.id, id),
  ]);
  // The scan analyzes only the first MAX_REVIEW_SECTIONS sections (60s cap). Warn if the contract
  // is longer, so the user knows the tail wasn't reviewed. Only surfaced when actually truncated.
  const truncated = totalSections > MAX_REVIEW_SECTIONS;

  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardHeader email={user.email} />
      <IssuesReview
        contractId={id}
        title={contract.title}
        status={contract.status}
        initialIssues={issues}
        truncated={truncated}
        analyzedSections={MAX_REVIEW_SECTIONS}
      />
    </div>
  );
}
