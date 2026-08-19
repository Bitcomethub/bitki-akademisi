import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { CoverBand } from "@/components/cover-band";

export default function Home() {
  const posts = getAllPosts();
  const [featured, ...rest] = posts;

  return (
    <main>
      {/* Hero SOLA hizalı. Ortalanmış hero, üretilmiş her sitenin ilk
          ekranı; sola hizalı bir başlık ise dergi kapağı gibi okunuyor ve
          okuyucunun gözü zaten satır başını arıyor.
          max-w-[16ch] başlığı bilerek iki satıra kırıyor — tek satırlık bir
          soru geniş ekranda cılız kalıyor. text-wrap:balance (globals.css)
          kırılmayı iki satıra eşit dağıtıyor. */}
      <section className="border-b border-stone-200 bg-gradient-to-b from-emerald-50 to-stone-50">
        <div className="wide-column py-16 sm:py-20">
          <h1 className="max-w-[16ch] font-serif text-h1 font-bold text-emerald-900">
            Hangi bitki neye iyi gelir?
          </h1>
          <p className="mt-5 max-w-[54ch] font-serif text-lede text-stone-600">
            Bitki Akademisi, şifalı bitkiler ve bitkisel ekstraktlar hakkında
            güvenilir, sade ve bilimsel temelli rehberler sunar.
          </p>
        </div>
      </section>

      {featured && (
        <section className="wide-column py-12">
          <Link
            href={`/blog/${featured.slug}`}
            className="group block rounded-2xl border border-stone-200 bg-white p-7 transition-shadow hover:shadow-lg sm:p-9"
          >
            <span className="mb-4 inline-block rounded-full bg-emerald-100 px-3 py-1 font-sans text-label font-bold uppercase text-emerald-700">
              {featured.category}
            </span>
            <h2 className="mb-3 font-serif text-h2 font-bold text-stone-900 transition-colors group-hover:text-emerald-900">
              {featured.title}
            </h2>
            {/* Öne çıkan yazının özeti gerçekten OKUNUYOR (tek kart, göz
                orada duruyor), o yüzden ızgara kartlarının 14px'i yerine
                17px ve ölçü kapaklı. */}
            <p className="max-w-[62ch] font-sans text-body text-stone-600">
              {featured.excerpt}
            </p>
          </Link>
        </section>
      )}

      <section className="wide-column pb-20">
        {/* "Son Yazılar" bir başlık değil, bir AYIRAÇ. Serif ve iri
            yapılırsa altındaki yazı başlıklarıyla yarışır; küçük, aralıklı,
            büyük harf sans + ince çizgi ise bölümü sessizce açıyor. */}
        <h2 className="mb-6 border-b border-stone-200 pb-3 font-sans text-label font-bold uppercase text-stone-500">
          Son Yazılar
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
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
                <h3 className="mb-2 font-serif text-h3 font-bold text-stone-900 transition-colors group-hover:text-emerald-900">
                  {post.title}
                </h3>
                <p className="line-clamp-3 font-sans text-meta text-stone-600">
                  {post.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
