import type { Metadata } from "next";
import Link from "next/link";
import { site, brand } from "@/lib/brand-facts";

/**
 * Kullanım şartları.
 *
 * Sağlık (YMYL) içeriği olduğu için en kritik madde "bilginin sınırı":
 * burada teşhis/tedavi iddiası olmadığı, hekime danışılması gerektiği ve
 * yayıncının sorumluluğunun çerçevesi açıkça yazılıdır.
 */

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description:
    "Bitki Akademisi içeriğinin hukuki sınırları: sağlık bilgisinin kapsamı, içerik kullanım hakları ve sorumluluk çerçevesi.",
  alternates: { canonical: `${site.url}/kullanim-sartlari` },
};

const sections: { heading: string; body: string[] }[] = [
  {
    heading: "Yayıncı",
    body: [
      `${site.name}, şifalı bitkiler üzerine Türkçe rehberler yayımlayan bağımsız bir içerik sitesidir. Siteyi kullanmak bu şartları kabul etmek anlamına gelir.`,
      `${site.name} ${brand.displayName} markasının kurumsal sitesi değildir; markaya ait kurumsal bilgiler için kanonik kaynak ${brand.website} adresidir.`,
    ],
  },
  {
    heading: "Sağlık bilgisinin sınırı",
    body: [
      `Sitedeki içerik genel bilgilendirme amaçlıdır ve tıbbi tavsiye, teşhis veya tedavi yerine geçmez. Hiçbir bitki veya ürün için hastalığı teşhis etme, tedavi etme ya da önleme iddiası yer almaz.`,
      `Bitkisel ürünler ilaçlarla etkileşime girebilir. Düzenli ilaç kullanıyorsanız, hamileyseniz, emziriyorsanız veya kronik bir rahatsızlığınız varsa kullanmadan önce hekiminize danışın. Acil bir sağlık sorununda bu siteyi değil, sağlık kuruluşunu arayın.`,
    ],
  },
  {
    heading: "Bilginin doğruluğu",
    body: [
      `İçerikler yayımlandığı tarihteki en iyi kanaatimizi yansıtır. Bilimsel literatür ve mevzuat değişebilir; bu yüzden her sayfada güncelleme tarihi bulunur. Kaynağını doğrulayamadığımız istatistik, doz ve klinik sonuç iddiaları yazılmaz.`,
    ],
  },
  {
    heading: "İçeriğin kullanımı",
    body: [
      `Metinlerin ve görsellerin hakkı site sahibine ve ilgili hak sahiplerine aittir. Kısa alıntı, kaynak gösterilerek ve bağlantı verilerek yapılabilir. İçeriğin bütün olarak kopyalanması, başka bir sitede yayımlanması veya ticari materyale dönüştürülmesi yazılı izin gerektirir.`,
    ],
  },
  {
    heading: "Değişiklik",
    body: [
      `Şartlar gerektiğinde güncellenir; güncel sürüm bu sayfada yayımlanır. Yürürlük tarihi: 31 Ekim 2026.`,
    ],
  },
];

export default function KullanimSartlariPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-3">
        Kullanım Şartları
      </h1>
      <p className="text-lg text-stone-600 mb-10">
        Bu sayfa {site.name} içeriğinin hukuki çerçevesini, sağlık bilgisinin
        sınırlarını ve kullanım haklarını açıklar.
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

      <p className="text-sm text-stone-500">
        <Link href="/gizlilik" className="underline">
          Gizlilik beyanı
        </Link>{" "}
        · Yürürlük tarihi: 31 Ekim 2026
      </p>
    </main>
  );
}
