import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/posts";
import { site } from "@/lib/brand-facts";
import { CoverBand } from "@/components/cover-band";

/**
 * canonical AÇIKÇA verilir — mirasa BIRAKILMAZ.
 *
 * layout.tsx site geneli `alternates.canonical` olarak ANA SAYFAYI tanımlıyor
 * (anasayfanın kendisi için doğru). Ama Next.js bu değeri override etmeyen
 * HER sayfaya miras bırakır: bu alan olmadan /blog kendini "ana sayfa" ilan
 * ediyordu. Aynı içerik iki URL'de görününce arama motoru ikisinden birini
 * seçer ve genelde yanlış olanı seçer — liste sayfası indeksten düşer, sıra
 * ana sayfaya kayar. Canonical'ın kendi URL'ini göstermesi bu sayfanın
 * indekslenebilirliğinin ön koşulu.
 */
export const metadata: Metadata = {
  title: "Tüm Rehberler",
  description: "Şifalı bitkiler ve doğal sağlık üzerine tüm rehber yazılarımız.",
  alternates: { canonical: `${site.url}/blog` },
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
            className="block overflow-hidden rounded-xl border border-stone-200 bg-white hover:shadow-md transition-shadow"
          >
            <CoverBand
              slug={post.slug}
              category={post.category}
              plant={post.plant}
            />
            <div className="p-6">
              <span className="inline-block text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mb-3">
                {post.category}
              </span>
              <h2 className="font-bold text-lg text-stone-900 mb-2">
                {post.title}
              </h2>
              <p className="text-sm text-stone-600">{post.excerpt}</p>
              <p className="text-xs text-stone-400 mt-3">{post.date}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
