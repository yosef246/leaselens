"use client";

/**
 * Contracts list with a Process action + live status. The /process endpoint is synchronous
 * but persists each status transition; while any contract is transient we poll via
 * router.refresh() so parsing → parsed → embedded shows up without a manual reload.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContractRow, ContractStatus } from "@/lib/db/contracts";

const STATUS_LABEL: Record<ContractStatus, string> = {
  uploaded: "הועלה",
  parsing: "מפרסר…",
  parsed: "פורסר",
  embedded: "מוטמע ✓",
  failed: "נכשל",
};

const TRANSIENT: ContractStatus[] = ["parsing", "parsed"];

export function ContractList({ contracts }: { contracts: ContractRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const anyTransient = useMemo(
    () =>
      contracts.some((c) => TRANSIENT.includes(c.status)) ||
      Object.values(busy).some(Boolean),
    [contracts, busy]
  );

  // Poll while something is in flight.
  useEffect(() => {
    if (!anyTransient) return;
    const t = setTimeout(() => router.refresh(), 1500);
    return () => clearTimeout(t);
  }, [anyTransient, contracts, router]);

  // Clear the local busy flag once the server reports a terminal status.
  useEffect(() => {
    setBusy((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const c of contracts) {
        if (next[c.id] && (c.status === "embedded" || c.status === "failed")) {
          delete next[c.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [contracts]);

  const process = useCallback(
    async (id: string) => {
      setBusy((b) => ({ ...b, [id]: true }));
      setErrors((e) => {
        const next = { ...e };
        delete next[id];
        return next;
      });
      try {
        const res = await fetch(`/api/contracts/${id}/process`, { method: "POST" });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setErrors((e) => ({ ...e, [id]: data.error ?? "העיבוד נכשל" }));
        }
      } catch {
        setErrors((e) => ({ ...e, [id]: "העיבוד נכשל — נסה שוב" }));
      } finally {
        router.refresh();
      }
    },
    [router]
  );

  if (contracts.length === 0) {
    return <p className="text-sm text-stone-500">עדיין לא הועלו חוזים.</p>;
  }

  return (
    <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
      {contracts.map((c) => {
        const isBusy = busy[c.id] || TRANSIENT.includes(c.status);
        const canProcess = !isBusy && (c.status === "uploaded" || c.status === "failed");
        return (
          <li key={c.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-medium text-stone-900">{c.title}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                  {isBusy && !TRANSIENT.includes(c.status)
                    ? "מעבד…"
                    : STATUS_LABEL[c.status] ?? c.status}
                </span>
                {canProcess && (
                  <button
                    type="button"
                    onClick={() => process(c.id)}
                    className="rounded-md border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-900 hover:bg-stone-100"
                  >
                    {c.status === "failed" ? "עבד מחדש" : "עבד"}
                  </button>
                )}
              </div>
            </div>
            {errors[c.id] && <p className="text-xs text-red-600">{errors[c.id]}</p>}
          </li>
        );
      })}
    </ul>
  );
}
