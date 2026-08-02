/**
 * Makale sayfasının JSON-LD grafiği.
 *
 * Sayfa bileşeninden ayrı tutuluyor çünkü tek kural var: BURADAKİ HER ALAN
 * SAYFADA GÖRÜNEN METİNDEN TÜRETİLİR. Şemaya sayfada olmayan bir şey yazmak
 * (özellikle FAQPage) Google yapılandırılmış veri ihlalidir. Post tipi
 * yapısal olduğu için buradaki her değer doğrudan render edilen alandan gelir.
 *
 * Grafik üç düğüm içerir ve hepsi layout.tsx'teki site grafiğine @id ile
 * bağlanır — motorlar makaleyi yayıncıya, yayıncıyı da İmmu-Nat'a tek
 * okumada bağlayabilsin diye.
 */
import { site } from "@/lib/brand-facts";
import { COVER_SIZE, coverUrl } from "@/lib/cover";
import type { Post } from "@/lib/posts";

export function postUrl(slug: string): string {
  return `${site.url}/blog/${slug}`;
}

export function postGraph(post: Post) {
  const url = postUrl(post.slug);

  const article: Record<string, unknown> = {
    "@type": "Article",
    "@id": `${url}#article`,
    isPartOf: { "@id": `${site.url}/#website` },
    mainEntityOfPage: url,
    url,
    headline: post.title,
    alternativeHeadline: post.question,
    description: post.excerpt,
    abstract: post.keyTakeaway,
    inLanguage: "tr-TR",
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: { "@id": `${site.url}/#organization` },
    publisher: { "@id": `${site.url}/#organization` },
    articleSection: post.category,
    keywords: post.keywords.join(", "),
    breadcrumb: { "@id": `${url}#breadcrumb` },
    // Article.image, makaleyi TEMSİL eden görsel — gövdeye gömülü bir görsel
    // olmak zorunda değil; og:image mekanizmasının şemadaki karşılığı budur.
    // Bu, dosyanın başındaki "sayfada olmayanı şemaya yazma" kuralının istisnası
    // değil, kapsamı dışı: kural METİN alanları içindir (özellikle FAQPage),
    // çünkü orada görünmeyen metin doğrudan ihlaldir. Görselde Google'ın tek
    // şartı URL'in taranabilir ve indekslenebilir olması — /kapak/<slug>.png
    // build anında üretilen statik bir dosya, ikisini de karşılıyor.
    image: {
      "@type": "ImageObject",
      url: coverUrl(post.slug),
      width: COVER_SIZE.width,
      height: COVER_SIZE.height,
    },
    // Sesli asistanlar ve AI motorları için "sayfanın cevabı burası" işareti.
    // .geo-answer sınıfı sayfada keyTakeaway kutusundadır.
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".geo-answer"],
    },
  };

  // Makalenin konusu olan bitki, adlandırılmış bir entity olarak bildirilir.
  if (post.plant) {
    article.about = { "@type": "Thing", name: post.plant };
  }
  // Ürün bağlantısı varsa İmmu-Nat'tan bahsedildiğini açıkça beyan ediyoruz;
  // gizli reklam değil, beyan edilmiş ticari ilişki.
  if (post.amazonUrl) {
    article.mentions = { "@id": `${site.url}/#immunat` };
  }

  const faqPage = {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    inLanguage: "tr-TR",
    mainEntity: post.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Anasayfa", item: site.url },
      { "@type": "ListItem", position: 2, name: "Rehberler", item: `${site.url}/blog` },
      { "@type": "ListItem", position: 3, name: post.title },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [article, faqPage, breadcrumb],
  };
}
