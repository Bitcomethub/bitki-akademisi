import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <section className="bg-gradient-to-b from-emerald-50 to-stone-50 border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 py-24 text-center">
          <div className="text-6xl mb-6">🌿</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-emerald-900 mb-4">
            Bu sayfa bulunamadı
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto mb-8">
            Aradığınız rehber ya taşınmış ya da hiç var olmamış olabilir. Ama
            merak etmeyin, aramaya devam edebilirsiniz.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-block rounded-full bg-emerald-700 text-white px-6 py-3 font-semibold hover:bg-emerald-800 transition-colors"
            >
              Anasayfaya dön
            </Link>
            <Link
              href="/blog"
              className="inline-block rounded-full border border-emerald-700 text-emerald-800 px-6 py-3 font-semibold hover:bg-emerald-100 transition-colors"
            >
              Tüm rehberlere göz at
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
