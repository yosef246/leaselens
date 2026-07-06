import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-stone-50 p-8 text-center">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
          LeaseLens
        </h1>
        <p className="mt-2 text-stone-600">
          ניתוח חוזי שכירות בעברית מול החוק הישראלי
        </p>
      </div>
      <p className="max-w-md text-sm text-stone-500">
        הפרויקט בבנייה — שלב P0 הושלם. דף הפיתוח:{" "}
        <Link
          href="/dev"
          className="font-medium text-stone-900 underline underline-offset-4"
        >
          /dev
        </Link>
      </p>
    </main>
  );
}
