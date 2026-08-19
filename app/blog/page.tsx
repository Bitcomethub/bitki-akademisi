import Link from "next/link";
import type { Metadata } from "next";
import { formatPostDate, getAllPosts } from "@/lib/posts";
import { CoverBand } from "@/components/cover-band";

export const metadata: Metadata = {
  title: "Tüm Rehberler",
  description: "Şifalı bitkiler ve doğal sağlık üzerine tüm rehber yazılarımız.",
};

export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <main className="wide-column py-14">
      <h1 className="mb-10 font-serif text-h1 font-bold text-stone-900">
        Tüm Rehberler
      </h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block overflow-hidden rounded-2xl border border-stone-200 bg-white transition-shadow hover:shadow-md"
          >
            <CoverBand
              slug={post.slug}
              category={post.category}
              plant={post.plant}
            />
            <div className="p-5">
              <span className="mb-3 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 font-sans text-label font-bold uppercase text-emerald-700">
                {post.category}
              </span>
              <h2 className="mb-2 font-serif text-h3 font-bold text-stone-900 transition-colors group-hover:text-emerald-900">
                {post.title}
              </h2>
              <p className="font-sans text-meta text-stone-600">
                {post.excerpt}
              </p>
              {/* İKİ HATA BİRDEN düzeltildi:
                  1. Ham ISO dizgisi ("2026-08-19") basılıyordu; makale
                     sayfasında biçimlendirilmiş, listede değil. Artık ikisi
                     de lib/posts.ts'teki tek fonksiyondan geçiyor.
                  2. text-stone-400 beyaz üzerinde 2.59:1 ölçüldü — WCAG AA
                     4.5:1 eşiğinin çok altında. stone-500 4.81:1 veriyor.
                  <time> etiketi hem makine-okunur tarihi taşıyor hem de
                     globals.css'teki tabular-nums kuralını devralıyor. */}
              <time
                dateTime={post.date}
                className="mt-3 block font-sans text-label text-stone-500"
              >
                {formatPostDate(post.date)}
              </time>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
