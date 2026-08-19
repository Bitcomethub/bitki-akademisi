import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  formatPostDate,
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
    // Ölçü kapağı burada: max-w-3xl (736px ≈ 90 karakter) yerine 68ch.
    // Gerekçe ve `ch` seçiminin nedeni globals.css'te.
    <main className="reading-column py-10">
      {/* Article + FAQPage + BreadcrumbList — hepsi aşağıda render edilen
          metinden türetilir, elle yazılmış tek bir alan yok. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postGraph(post)) }}
      />

      <nav
        aria-label="Breadcrumb"
        className="mb-6 font-sans text-meta text-stone-500"
      >
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

      <header className="mt-7">
        {/* Kategori rozeti: küçük, BÜYÜK HARF, pozitif harf aralıklı sans.
            Beş referansın üçü (oura, noom, flo) kategorik etiketi tam olarak
            böyle ayırıyor — büyük harf burada "bağırmak" değil, "bu bir
            etiket, cümle değil" demenin tipografik yolu. */}
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 font-sans text-label font-bold uppercase text-emerald-700">
          {post.category}
        </span>
        <h1 className="mt-5 mb-3 font-serif text-h1 font-bold text-stone-900">
          {post.title}
        </h1>
        <p className="font-sans text-meta text-stone-500">
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          {post.updated && post.updated !== post.date && (
            <>
              {" · "}
              <span>
                Güncelleme:{" "}
                <time dateTime={post.updated}>{formatPostDate(post.updated)}</time>
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
        className="geo-answer mt-9 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-7"
      >
        <p className="mb-2 font-sans text-label font-bold uppercase text-emerald-800">
          Kısa cevap
        </p>
        {/* Sayfanın en çok alıntılanan bloğu, en okunaklı ölçüsünü hak
            ediyor: soru h3 ölçeğinde, cevap gövdeden bir kademe büyük.
            Ölçek merdiveninde yükselmek, kutuyu renkle bağırtmadan
            "burası önemli" demenin sessiz yolu. */}
        <h2
          id="kisa-cevap"
          className="mb-3 font-serif text-h3 font-bold text-emerald-950"
        >
          {post.question}
        </h2>
        <p className="font-serif text-lede text-stone-800">
          {post.keyTakeaway}
        </p>
      </section>

      {/* Giriş = spot. Gövdeden bir kademe büyük, böylece okuyucu nereden
          başlayacağını aramıyor. */}
      <div className="mt-9 space-y-4">
        {post.intro.map((paragraph, i) => (
          <p key={i} className="text-lede text-stone-700">
            {paragraph}
          </p>
        ))}
      </div>

      <nav
        aria-label="İçindekiler"
        className="mt-11 rounded-2xl border border-stone-200 bg-white p-6 font-sans"
      >
        {/* Tamamı sans: içindekiler okunan metin değil, KULLANILAN bir
            araç. Aile ayrımı okuyucuya "burası gezinme" sinyalini boyut ya
            da renk harcamadan veriyor. */}
        <h2 className="mb-3 text-label font-bold uppercase text-stone-500">
          İçindekiler
        </h2>
        <ol className="list-inside list-decimal space-y-2 text-meta text-stone-600">
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

      {/* Bölümler arası boşluk (space-y-12) başlık-gövde boşluğundan
          (mb-4) belirgin biçimde büyük. Ritim hiyerarşiyi boyuttan bağımsız
          olarak da taşıyor: nerede yeni bir konu başladığı, başlığı
          okumadan önce boşluktan anlaşılıyor. */}
      <article className="mt-12 space-y-12">
        {post.sections.map((section) => (
          <section key={section.heading} id={headingId(section.heading)}>
            <h2 className="mb-4 scroll-mt-8 font-serif text-h2 font-bold text-stone-900">
              {section.heading}
            </h2>
            <div className="space-y-4">
              {section.body.map((paragraph, i) => (
                <p key={i} className="text-stone-700">
                  {paragraph}
                </p>
              ))}
            </div>
            {section.list && (
              <ul className="mt-5 list-outside list-disc space-y-2 pl-5 text-stone-700 marker:text-emerald-600">
                {section.list.map((item) => (
                  <li key={item} className="pl-1">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>

      {/* SSS artık kart yığını DEĞİL, ince çizgiyle ayrılmış bir liste.
          Beş özdeş kutu alt alta dizildiğinde her biri kendi çerçevesiyle
          dikkat istiyor ve blok bir "widget" gibi okunuyor; oysa burası
          yazının devamı. Çerçeveyi kaldırınca sayfada tek bir okuma yüzeyi
          kalıyor. Yapı (h3 = soru, p = cevap) aynen korundu — FAQPage
          şeması post.faqs'ten türüyor, DOM'dan değil, ama görünen sırayla
          şemanın örtüşmesi bilinçli. */}
      <section id="sikca-sorulan-sorular" className="mt-16 scroll-mt-8">
        <h2 className="mb-2 font-serif text-h2 font-bold text-stone-900">
          Sıkça sorulan sorular
        </h2>
        <div className="divide-y divide-stone-200 border-t border-stone-200">
          {post.faqs.map((faq) => (
            <div key={faq.q} className="py-6">
              <h3 className="mb-2 font-serif text-h3 font-bold text-stone-900">
                {faq.q}
              </h3>
              <p className="text-stone-700">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/*
        TİCARİ BAĞLANTI — reklam kutusu gibi DEĞİL, "ilgili ürün" notu gibi.
        Ortalanmış, büyük, renkli bir buton okuyucuya "burası reklam" der ve
        yazının geri kalanına duyulan güveni de yanında götürür. Sola hizalı,
        küçük başlıklı ve tek satırlık bir not ise editoryal kalır.

        Üstteki gri satır ZORUNLU: rel="sponsored" yalnızca tarayıcı ve arama
        motoru için bir sinyal, okuyucu onu görmez. İlişkiyi GÖRÜNÜR biçimde
        beyan etmek hem dürüstlük hem de AI motorları için güven sinyalidir —
        gizlenmiş ticari ilişki bulunduğunda kaybedilen itibar, kazanılan
        tıklamadan pahalıdır.
      */}
      {post.amazonUrl && (
        <aside className="mt-12 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
          <p className="text-xs text-stone-500 mb-2">
            Bu yazıda İmmu-Nat&apos;ın ilgili ürünlerine yer verilmiştir.
            Bağlantı Amazon.com.tr&apos;ye gider.
          </p>
          <h2 className="text-sm font-semibold text-stone-900 mb-1">
            Yazıda geçen ürün
          </h2>
          <p className="text-stone-700 leading-relaxed">
            {post.productName
              ? `İmmu-Nat ${post.productName}`
              : "İmmu-Nat bitkisel sıvı ekstraktları"}
            {" — "}
            <a
              href={post.amazonUrl}
              target="_blank"
              rel="noopener sponsored"
              className="font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
            >
              {/*
                Metin linkin GERÇEKTE nereye gittiğini söyler. ASIN yoksa link
                arama sonucuna düşer; "ürün sayfası" demek yanlış beklenti
                yaratır ve tıklayan kişi kandırıldığını hisseder.
              */}
              {post.amazonIsDirect
                ? "Amazon.com.tr ürün sayfası"
                : "Amazon.com.tr'de ara"}
            </a>
          </p>
        </aside>
      )}

      <p className="mt-10 border-t border-stone-200 pt-6 font-sans text-meta text-stone-500">
        Bu içerik bilgilendirme amaçlıdır, tıbbi tavsiye yerine geçmez ve
        hastalık teşhis, tedavi veya önleme iddiası içermez. Aktarılan
        kullanımlar geleneksel bilgi ve genel kaynaklara dayanır; kendi
        kaynaklarınızı doğrulayın. Düzenli ilaç kullanıyorsanız, gebe veya
        emziriyorsanız bitkisel takviyelere başlamadan önce hekiminize danışın.
      </p>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-serif text-h2 font-bold text-stone-900">
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
                <span className="block p-5 font-sans">
                  <span className="mb-2 block text-label font-bold uppercase text-emerald-700">
                    {item.category}
                  </span>
                  <span className="block text-meta font-semibold leading-snug text-stone-900">
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
