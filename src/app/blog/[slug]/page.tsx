import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { getAllPosts, getPost } from "@/lib/blog";

// SSG + ISR: pages are prebuilt for every known slug and revalidated at most hourly.
export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${slug}`,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified ?? post.datePublished,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    inLanguage: "he-IL",
    datePublished: post.datePublished,
    dateModified: post.dateModified ?? post.datePublished,
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` },
    },
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={articleSchema} />
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
          ← לכל המאמרים
        </Link>

        <article className="mt-6">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            <time dateTime={post.datePublished}>{post.datePublished}</time> · זמן קריאה{" "}
            {post.readingMinutes} דק׳
          </p>

          <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted-foreground">
            {post.body.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
