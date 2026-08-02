import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function Home() {
  const posts = getAllPosts();
  const [featured, ...rest] = posts;

  return (
    <main>
      <section className="bg-gradient-to-b from-emerald-50 to-stone-50 border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-emerald-900 mb-4">
            Hangi bitki neye iyi gelir?
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            Bitki Akademisi, şifalı bitkiler ve bitkisel ekstraktlar hakkında
            güvenilir, sade ve bilimsel temelli rehberler sunar.
          </p>
        </div>
      </section>

      {featured && (
        <section className="max-w-5xl mx-auto px-4 py-12">
          <Link
            href={`/blog/${featured.slug}`}
            className="block rounded-2xl border border-stone-200 bg-white p-8 hover:shadow-lg transition-shadow"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mb-4">
              {featured.category}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-3">
              {featured.title}
            </h2>
            <p className="text-stone-600">{featured.excerpt}</p>
          </Link>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-xl font-bold text-stone-900 mb-6">Son Yazılar</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-xl border border-stone-200 bg-white p-6 hover:shadow-md transition-shadow"
            >
              <span className="inline-block text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mb-3">
                {post.category}
              </span>
              <h3 className="font-bold text-stone-900 mb-2">{post.title}</h3>
              <p className="text-sm text-stone-600 line-clamp-3">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
