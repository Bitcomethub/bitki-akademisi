import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
  headingId,
  readingMinutes,
} from "@/lib/posts";
import { postGraph, postUrl } from "@/lib/post-schema";
import { COVER_SIZE, coverPath } from "@/lib/cover";
import { CoverBand } from "@/components/cover-band";

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
  const url = postUrl(post.slug);
  // Tek görsel, üç yerde: og:image, twitter:image ve JSON-LD image.
  // metadataBase layout'ta tanımlı olduğu için göreli yol mutlak URL'e
  // çevriliyor — adresi ikinci kez elle yazmıyoruz, ayrışma riski yok.
  const cover = {
    url: coverPath(post.slug),
    width: COVER_SIZE.width,
    height: COVER_SIZE.height,
    alt: post.question,
  };
  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url,
      locale: "tr_TR",
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      section: post.category,
      tags: post.keywords,
      images: [cover],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [cover],
    },
    alternates: { canonical: url },
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post.slug);
  const minutes = readingMinutes(post);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Article + FAQPage + BreadcrumbList — hepsi aşağıda render edilen
          metinden türetilir, elle yazılmış tek bir alan yok. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postGraph(post)) }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-stone-500 mb-6">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-emerald-700">
              Anasayfa
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/blog" className="hover:text-emerald-700">
              Rehberler
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-stone-700">{post.category}</li>
        </ol>
      </nav>

      {/* Şerit başlığın ÜSTÜNDE ama kısa cevap kutusunu ilk ekrandan
          düşürmeyecek yükseklikte (mobilde 160px). Kapak PNG'sini buraya
          gömseydik hem soru iki kez görünürdü hem de sayfanın en önemli
          bloğu — motorun alıntıladığı cevap — katlamanın altına inerdi. */}
      <CoverBand
        slug={post.slug}
        category={post.category}
        plant={post.plant}
        size="hero"
      />

      <header className="mt-6">
        <span className="inline-block text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
          {post.category}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900 mt-4 mb-3">
          {post.title}
        </h1>
        <p className="text-sm text-stone-500">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          {post.updated && post.updated !== post.date && (
            <>
              {" · "}
              <span>
                Güncelleme:{" "}
                <time dateTime={post.updated}>{formatDate(post.updated)}</time>
              </span>
            </>
          )}
          {` · ${minutes} dk okuma`}
        </p>
      </header>

      {/* Sayfanın alıntılanabilir cevabı. .geo-answer sınıfı JSON-LD'deki
          speakable seçicisiyle eşleşir — AI motorları için "cevap burada".
          Soru BAŞLIK olarak görünür: görünür soru + hemen ardından cevap,
          motorların çıkarabildiği en net kalıptır. Ayrıca şemadaki
          alternativeHeadline alanının sayfadaki karşılığı budur — şemada
          olup sayfada olmayan alan bırakmıyoruz. */}
      <section
        aria-labelledby="kisa-cevap"
        className="geo-answer mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-2">
          Kısa cevap
        </p>
        <h2 id="kisa-cevap" className="text-lg font-bold text-emerald-950 mb-3">
          {post.question}
        </h2>
        <p className="text-stone-800 leading-relaxed">{post.keyTakeaway}</p>
      </section>

      <div className="mt-8 space-y-4">
        {post.intro.map((paragraph, i) => (
          <p key={i} className="text-lg text-stone-700 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      <nav
        aria-label="İçindekiler"
        className="mt-10 rounded-xl border border-stone-200 bg-white p-6"
      >
        <h2 className="text-sm font-semibold text-stone-900 mb-3">İçindekiler</h2>
        <ol className="space-y-2 text-sm text-stone-600 list-decimal list-inside">
          {post.sections.map((section) => (
            <li key={section.heading}>
              <a
                href={`#${headingId(section.heading)}`}
                className="hover:text-emerald-700"
              >
                {section.heading}
              </a>
            </li>
          ))}
          <li>
            <a href="#sikca-sorulan-sorular" className="hover:text-emerald-700">
              Sıkça sorulan sorular
            </a>
          </li>
        </ol>
      </nav>

      <article className="mt-10 space-y-10">
        {post.sections.map((section) => (
          <section key={section.heading} id={headingId(section.heading)}>
            <h2 className="text-2xl font-bold text-stone-900 mb-4 scroll-mt-8">
              {section.heading}
            </h2>
            <div className="space-y-4">
              {section.body.map((paragraph, i) => (
                <p key={i} className="text-stone-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
            {section.list && (
              <ul className="mt-4 space-y-2 list-disc list-outside pl-5 text-stone-700">
                {section.list.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>

      <section id="sikca-sorulan-sorular" className="mt-14 scroll-mt-8">
        <h2 className="text-2xl font-bold text-stone-900 mb-6">
          Sıkça sorulan sorular
        </h2>
        <div className="space-y-4">
          {post.faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-xl border border-stone-200 bg-white p-6"
            >
              <h3 className="font-semibold text-stone-900 mb-2">{faq.q}</h3>
              <p className="text-stone-700 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {post.amazonUrl && (
        <aside className="mt-12 p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <p className="text-stone-700 mb-3">
            {post.productName
              ? `İmmu-Nat ${post.productName} ürününü Amazon.com.tr'de inceleyebilirsiniz.`
              : "İmmu-Nat'ın bitkisel ekstraktlarını Amazon.com.tr'de inceleyebilirsiniz."}
          </p>
          <a
            href={post.amazonUrl}
            target="_blank"
            rel="noopener sponsored"
            className="inline-block bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            Amazon&apos;da İncele
          </a>
        </aside>
      )}

      <p className="mt-8 text-sm text-stone-500 leading-relaxed border-t border-stone-200 pt-6">
        Bu içerik bilgilendirme amaçlıdır, tıbbi tavsiye yerine geçmez ve
        hastalık teşhis, tedavi veya önleme iddiası içermez. Düzenli ilaç
        kullanıyorsanız, gebe veya emziriyorsanız bitkisel takviyelere
        başlamadan önce hekiminize danışın.
      </p>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold text-stone-900 mb-6">
            İlgili rehberler
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                className="block overflow-hidden rounded-xl border border-stone-200 bg-white hover:shadow-md transition-shadow"
              >
                <CoverBand
                  slug={item.slug}
                  category={item.category}
                  plant={item.plant}
                />
                <span className="block p-5">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">
                    {item.category}
                  </span>
                  <span className="block font-semibold text-stone-900 text-sm leading-snug">
                    {item.title}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
