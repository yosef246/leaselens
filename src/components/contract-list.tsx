"use client";

/**
 * Contracts grid with a Process action + live status. The /process endpoint persists each
 * status transition; while anything is transient we poll via router.refresh(). Embedded
 * contracts link to the results view (/contracts/[id]).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, MessageSquareText, FileQuestion } from "lucide-react";
import { toast } from "sonner";
import type { ContractRow, ContractStatus } from "@/lib/db/contracts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TRANSIENT: ContractStatus[] = ["parsing", "parsed"];

const STATUS: Record<ContractStatus, { label: string; className: string }> = {
  uploaded: { label: "הועלה", className: "bg-secondary text-secondary-foreground" },
  parsing: { label: "מעבד…", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  parsed: { label: "מעבד…", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  embedded: { label: "מוכן ✓", className: "bg-primary/15 text-primary" },
  failed: { label: "נכשל", className: "bg-destructive/15 text-destructive" },
};

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );

export function ContractList({ contracts }: { contracts: ContractRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const anyTransient = useMemo(
    () =>
      contracts.some((c) => TRANSIENT.includes(c.status)) || Object.values(busy).some(Boolean),
    [contracts, busy]
  );

  useEffect(() => {
    if (!anyTransient) return;
    const t = setTimeout(() => router.refresh(), 1500);
    return () => clearTimeout(t);
  }, [anyTransient, contracts, router]);

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
      try {
        const res = await fetch(`/api/contracts/${id}/process`, { method: "POST" });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(data.error ?? "העיבוד נכשל");
        }
      } catch {
        toast.error("העיבוד נכשל — נסה שוב");
      } finally {
        router.refresh();
      }
    },
    [router]
  );

  if (contracts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">עדיין לא הועלו חוזים</p>
          <p className="text-sm text-muted-foreground">העלה חוזה למעלה כדי להתחיל בניתוח.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {contracts.map((c) => {
        const isBusy = busy[c.id] || TRANSIENT.includes(c.status);
        const canProcess = !isBusy && (c.status === "uploaded" || c.status === "failed");
        const status = STATUS[c.status];
        return (
          <Card key={c.id} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{c.title}</span>
                </div>
                <Badge className={cn("shrink-0 border-transparent", status.className)}>
                  {isBusy && !TRANSIENT.includes(c.status) ? "מעבד…" : status.label}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">הועלה {fmtDate(c.created_at)}</p>

              <div className="mt-auto pt-2">
                {c.status === "embedded" ? (
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/contracts/${c.id}`}>
                      <MessageSquareText className="h-4 w-4" />
                      שאל שאלה
                    </Link>
                  </Button>
                ) : isBusy ? (
                  <Button size="sm" variant="secondary" className="w-full" disabled>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    מעבד…
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={c.status === "failed" ? "outline" : "default"}
                    className="w-full"
                    onClick={() => process(c.id)}
                    disabled={!canProcess}
                  >
                    {c.status === "failed" ? "עבד מחדש" : "עבד"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
