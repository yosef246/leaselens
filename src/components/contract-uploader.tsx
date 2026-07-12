"use client";

/**
 * Drag-drop PDF uploader. Posts to /api/contracts/upload, toasts the result, and refreshes
 * so the server-rendered contracts grid re-fetches.
 */
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ContractUploader() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        toast.error("נדרש קובץ PDF יחיד בגודל עד 10MB");
        return;
      }
      const file = accepted[0];
      if (!file) return;

      setUploading(true);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/contracts/upload", { method: "POST", body });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "העלאה נכשלה");
        }
        toast.success("החוזה הועלה — לחץ ״עבד״ כדי לנתח אותו");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "העלאה נכשלה");
      } finally {
        setUploading(false);
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
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/60",
        uploading && "pointer-events-none opacity-70"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        {uploading ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : (
          <UploadCloud className="h-7 w-7" />
        )}
      </div>
      {uploading ? (
        <p className="font-medium">מעלה…</p>
      ) : isDragActive ? (
        <p className="font-medium text-primary">שחרר כאן את קובץ ה-PDF</p>
      ) : (
        <div>
          <p className="font-medium">גרור לכאן חוזה PDF, או לחץ לבחירה</p>
          <p className="mt-1 text-sm text-muted-foreground">קובץ PDF טקסטואלי, עד 10MB</p>
        </div>
      )}
    </div>
  );
}
