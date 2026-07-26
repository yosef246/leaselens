import { COMMIT_SHA, BUILT_AT } from "@/generated/version";

export const metadata = { title: "LeaseLens — dev", robots: { index: false, follow: false } };

export default function DevPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 p-8">
      <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          LeaseLens dev
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          P0 bootstrap · Next.js 15 · App Router
        </p>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-stone-500">commit</dt>
            <dd className="font-mono text-stone-900">{COMMIT_SHA}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-stone-500">built</dt>
            <dd className="font-mono text-xs text-stone-700">{BUILT_AT}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-stone-500">env</dt>
            <dd className="font-mono text-stone-900">{process.env.NODE_ENV}</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
