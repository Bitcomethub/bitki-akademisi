import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPosts, getPostBySlug } from "@/lib/posts";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
    },
    alternates: {
      canonical: `https://bitkiakademisi.com/blog/${post.slug}`,
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { "@type": "Organization", name: "Bitki Akademisi" },
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href="/blog" className="text-sm text-emerald-700 hover:underline">
        ← Tüm rehberler
      </Link>
      <span className="block mt-4 inline-block text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full w-fit">
        {post.category}
      </span>
      <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mt-4 mb-2">
        {post.title}
      </h1>
      <p className="text-sm text-stone-400 mb-8">{post.date}</p>
      <article
        className="prose prose-stone max-w-none prose-headings:font-bold prose-a:text-emerald-700"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      {post.amazonUrl && (
        <div className="mt-10 p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <p className="text-stone-700 mb-3">
            İmmu-Nat&apos;ın bu içerikte bahsedilen bitkisel ekstraktlarını Amazon&apos;da inceleyin.
          </p>
          <a
            href={post.amazonUrl}
            target="_blank"
            rel="noopener sponsored"
            className="inline-block bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            Amazon&apos;da İncele
          </a>
        </div>
      )}
    </main>
  );
}
