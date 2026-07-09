"use client";

/**
 * Minimal drag-drop PDF uploader. Posts to /api/contracts/upload, then router.refresh()
 * so the server-rendered contracts list on the home page re-fetches. Skeleton for P2 —
 * no client-side parsing.
 */
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";

export function ContractUploader() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        setStatus("error");
        setError("נדרש קובץ PDF יחיד בגודל עד 10MB");
        return;
      }
      const file = accepted[0];
      if (!file) return;

      setStatus("uploading");
      setError(null);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/contracts/upload", {
          method: "POST",
          body,
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "העלאה נכשלה");
        }
        setStatus("idle");
        router.refresh();
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "העלאה נכשלה");
      }
    },
    [router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
    disabled: status === "uploading",
  });

  return (
    <div className="w-full max-w-md">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragActive
            ? "border-stone-900 bg-stone-100"
            : "border-stone-300 hover:border-stone-400"
        } ${status === "uploading" ? "pointer-events-none opacity-60" : ""}`}
      >
        <input {...getInputProps()} />
        {status === "uploading" ? (
          <p className="text-stone-600">מעלה…</p>
        ) : isDragActive ? (
          <p className="text-stone-900">שחרר כאן את קובץ ה-PDF</p>
        ) : (
          <p className="text-stone-600">גרור לכאן חוזה PDF, או לחץ לבחירה (עד 10MB)</p>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
