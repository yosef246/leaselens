import { DashboardHeader } from "@/components/dashboard-header";
import { Skeleton } from "@/components/ui/skeleton";

// Shown while the contract + its persisted issues load (Supabase) before the review renders.
export default function ContractReviewLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Skeleton className="mb-2 h-7 w-72" />
        <Skeleton className="mb-8 h-4 w-96 max-w-full" />
        <div className="space-y-5">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
}
