import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getAllPosts } from "@/lib/blog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Static index — regenerated at build; individual posts revalidate hourly.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "בלוג",
  description:
    "מדריכים בעברית על זכויות שוכרים וחוזי שכירות מול החוק הישראלי — פיקדון, תיקונים, פינוי ועוד.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">הבלוג של LeaseLens</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          מדריכים קצרים על חוזי שכירות וזכויות שוכרים מול החוק הישראלי.
        </p>

        <div className="mt-10 space-y-5">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block">
              <Card className="transition-colors hover:border-primary/50">
                <CardHeader>
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{post.description}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    <time dateTime={post.datePublished}>{post.datePublished}</time> · זמן קריאה{" "}
                    {post.readingMinutes} דק׳
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
