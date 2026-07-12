import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <div className="text-6xl" aria-hidden>
        🔍📄
      </div>
      <h1 className="text-3xl font-bold tracking-tight">הדף לא נמצא</h1>
      <p className="max-w-sm text-muted-foreground">
        כמו סעיף שנמחק מהחוזה — הדף הזה פשוט לא קיים. אולי חזרת רחוק מדי?
      </p>
      <Button asChild>
        <Link href="/">חזרה לדף הבית</Link>
      </Button>
    </div>
  );
}
