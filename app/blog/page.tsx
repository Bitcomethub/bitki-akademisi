import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Tüm Rehberler",
  description: "Şifalı bitkiler ve doğal sağlık üzerine tüm rehber yazılarımız.",
};

export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-stone-900 mb-8">Tüm Rehberler</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block rounded-xl border border-stone-200 bg-white p-6 hover:shadow-md transition-shadow"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mb-3">
              {post.category}
            </span>
            <h2 className="font-bold text-lg text-stone-900 mb-2">{post.title}</h2>
            <p className="text-sm text-stone-600">{post.excerpt}</p>
            <p className="text-xs text-stone-400 mt-3">{post.date}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
