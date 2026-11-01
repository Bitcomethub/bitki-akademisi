import type { Metadata } from "next";
import Link from "next/link";
import { site, brand } from "@/lib/brand-facts";

/**
 * Gizlilik beyanı.
 *
 * Google, bağlantı verilmese de bir gizlilik sayfası bekliyor; ayrıca
 * Organization şeması ve GEO tarafında "bu site veriyi ne yapıyor" sorusunun
 * kanonik cevabı burasıdır. Bu yüzden metin şablon değil: sitede gerçekten
 * ne olduğu yazılı (hesap yok, ölçümleme onaylı, satış yönlendirmesi var).
 */

export const metadata: Metadata = {
  title: "Gizlilik",
  description:
    "Bitki Akademisi hangi veriyi topluyor, hangisini toplamıyor, çerezleri nasıl kullanıyor ve silme talebini nasıl iletiyorsunuz?",
  alternates: { canonical: `${site.url}/gizlilik` },
};

const sections: { heading: string; body: string[] }[] = [
  {
    heading: "Hesap açmanız gerekmiyor",
    body: [
      `${site.name} üyelik, giriş veya yorum özelliği sunmaz. Rehberleri okumak için adınızı, e-postanızı ya da telefon numaranızı vermeniz gerekmez; bu bilgiler bir hesap altında tutulmaz.`,
    ],
  },
  {
    heading: "Ölçümleme yalnız onay verirseniz çalışır",
    body: [
      `Hangi rehberlerin okunduğunu görmek için Google Analytics kullanıyoruz. Çerez onayı vermezseniz ölçümleme çalışmaz ve site tam olarak aynı şekilde çalışmaya devam eder. Reklam çerezi, kişiselleştirilmiş reklam ve profilleme yoktur.`,
    ],
  },
  {
    heading: "Sunucu kayıtları",
    body: [
      `Sayfaların sunulması sırasında barındırma sağlayıcısı teknik kayıt tutar: istek zamanı, sayfa adresi, tarayıcı bilgisi ve IP adresi. Bu kayıtlar sitenin çalışması ve kötüye kullanımın önlenmesi için tutulur, pazarlama amacıyla kullanılmaz.`,
    ],
  },
  {
    heading: "Ürün bağlantıları ve üçüncü taraflar",
    body: [
      `${site.affiliation} Ürün yönlendirmeleri Amazon.com.tr üzerindeki ${brand.displayName} sayfalarına gider; tıkladığınızda Amazon'un kendi gizlilik ve çerez kuralları geçerli olur.`,
      `Sitede ayrıca kaynak gösterme amacıyla başka sitelere bağlantı verilebilir. Bu sitelerin veri işleme kuralları bizim denetimimizde değildir.`,
    ],
  },
  {
    heading: "Silme ve düzeltme talebi",
    body: [
      `Hakkınızda işlenen bir veri olduğunu düşünüyorsanız ya da bir bilginin yanlış olduğunu fark ettiyseniz, hangi sayfa ve hangi ifade olduğunu yazarak bildirin. Talebi aldıktan sonra kaydı inceler, gerekiyorsa siler ve sonucu size bildiririz.`,
    ],
  },
];

export default function GizlilikPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-3">
        Hangi veriyi topluyoruz?
      </h1>
      <p className="text-lg text-stone-600 mb-10">
        Bu sayfa {site.name}&apos;nin hangi veriyi işlediğini, hangisini
        işlemediğini ve silme talebini nasıl iletebileceğinizi anlatır.
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
        Bu beyan {site.name} için geçerlidir. Yürürlük tarihi: 31 Ekim 2026.{" "}
        <Link href="/kullanim-sartlari" className="underline">
          Kullanım şartları
        </Link>
      </p>
    </main>
  );
}
