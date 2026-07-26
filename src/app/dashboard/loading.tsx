import { DashboardHeader } from "@/components/dashboard-header";
import { Skeleton } from "@/components/ui/skeleton";

// Streamed instantly while the server component fetches the user's contracts (Supabase).
// Mirrors the dashboard layout so there's no layout shift when the real content swaps in.
export default function DashboardLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <section className="mt-10 space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </section>
      </main>
    </div>
  );
}
