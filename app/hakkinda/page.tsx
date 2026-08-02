import type { Metadata } from "next";
import { site, brand } from "@/lib/brand-facts";

/**
 * Hakkında / editoryal politika sayfası.
 *
 * GEO gerekçesi: sağlık (YMYL) içeriğinde AI motorlarının en sık aradığı güven
 * sinyali "bu içeriği kim yazıyor, nasıl doğruluyor, ticari bağı ne" sorusuna
 * verilen açık yanıttır. Bu sayfa olmadan içerik ne kadar iyi olursa olsun
 * E-E-A-T tarafında tavan yapıyor. Ayrıca Organization şemasındaki
 * `publishingPrinciples` alanının işaret ettiği kanonik hedef budur.
 */

export const metadata: Metadata = {
  title: "Hakkında ve Editoryal Politika",
  description:
    "Bitki Akademisi'nin yayın ilkeleri, içerik üretim yöntemi, ticari ilişki beyanı ve sağlık içeriği sınırları.",
  alternates: { canonical: `${site.url}/hakkinda` },
};

const sections: { heading: string; body: string[] }[] = [
  {
    heading: "Bitki Akademisi nedir?",
    body: [
      `${site.name}, şifalı bitkiler ve bitkisel sıvı ekstraktlar üzerine Türkçe rehberler yayımlayan bağımsız bir içerik sitesidir. Her rehber tek bir bitkiyi merkeze alır; "ne işe yarar", "nasıl kullanılır", "kimler kullanmamalı" gibi okuyucunun gerçekten sorduğu soruları sırayla yanıtlar.`,
      `Amacımız bir bitkiyi merak eden kişinin cevabı sayfanın ilk paragrafında bulmasıdır. Bu yüzden her yazı, başlıktaki soruya doğrudan yanıt veren bir cümleyle açılır.`,
    ],
  },
  {
    heading: "İçerikler nasıl üretiliyor?",
    body: [
      `Rehberler, yapay zekâ destekli bir üretim hattıyla hazırlanır ve yayımlanmadan önce otomatik bir kalite kapısından geçer. Bu kapı; marka bilgilerinin doğruluğunu, kaynaksız sayı kullanımını, hastalık tedavi iddiası içeren ifadeleri ve bölüm bütünlüğünü denetler. Kapıdan iki kez dönen taslak yayımlanmaz, insan incelemesine düşer.`,
      `Bitkiler hakkındaki bilgiler geleneksel kullanım ve yayımlanmış araştırma literatürünün genel çerçevesine dayanır. Kaynağını doğrulayamadığımız spesifik istatistikleri, doz iddialarını ve klinik sonuçları yazmıyoruz.`,
    ],
  },
  {
    heading: "Ticari ilişki beyanı",
    body: [
      site.affiliation,
      `${site.name} ${brand.displayName} markasının kurumsal sitesi değildir. Markaya ait kurumsal bilgiler için kanonik kaynak ${brand.website} adresidir. Ürün yönlendirmelerimiz Amazon.com.tr üzerindeki ${brand.displayName} sayfalarına yapılır.`,
    ],
  },
  {
    heading: "Sağlık içeriği sınırlarımız",
    body: [
      site.editorialPolicy,
      `Sitede hiçbir ürün veya bitki için hastalık teşhis etme, tedavi etme veya önleme iddiası yer almaz. Bitkisel ürünler ilaçlarla etkileşime girebilir; düzenli ilaç kullanıyorsanız, hamileyseniz, emziriyorsanız veya kronik bir rahatsızlığınız varsa kullanmadan önce hekiminize danışın.`,
    ],
  },
];

export default function HakkindaPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-3">
        Hakkında ve Editoryal Politika
      </h1>
      <p className="text-lg text-stone-600 mb-10">
        Bu sayfa, {site.name}&apos;nin içeriği nasıl ürettiğini, neyi
        iddia etmediğini ve ticari bağlantısını açıkça beyan eder.
      </p>

      {sections.map((s) => (
        <section key={s.heading} className="mb-10">
          <h2 className="text-xl font-bold text-stone-900 mb-3">{s.heading}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="text-stone-700 leading-relaxed mb-3">
              {p}
            </p>
          ))}
        </section>
      ))}

      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-bold text-stone-900 mb-3">
          {brand.displayName} künyesi
        </h2>
        <dl className="text-sm text-stone-700 space-y-1">
          <div>
            <dt className="inline font-semibold">Tüzel unvan: </dt>
            <dd className="inline">{brand.legalName}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Kuruluş: </dt>
            <dd className="inline">
              {brand.founded}, {brand.foundedPlace}
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold">Adres: </dt>
            <dd className="inline">{brand.address}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Resmî site: </dt>
            <dd className="inline">
              <a
                href={brand.website}
                className="text-emerald-700 hover:underline"
                rel="noopener"
              >
                {brand.website}
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
