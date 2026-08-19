import type { Metadata } from "next";
import Link from "next/link";
import { Literata, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import {
  organizationSchema,
  webSiteSchema,
  immuNatBrandSchema,
} from "@/lib/brand-facts";
import { COVER_SIZE, SITE_COVER_SLUG, coverPath } from "@/lib/cover";

const siteUrl = "https://bitkiakademisi.com";

/**
 * İKİ AİLE, İKİ İŞ. Ayrıntılı gerekçe globals.css'in başında.
 *
 * `latin-ext` alt kümesi SÜS DEĞİL, ZORUNLU: `latin` alt kümesi tek başına
 * ı, İ, ğ, Ğ, ş, Ş karakterlerini İÇERMEZ. Yalnızca `latin` yüklenirse
 * tarayıcı bu harfleri sistem fontundan tamamlar ve "ışığı" gibi bir kelime
 * KELİME ORTASINDA font değiştirir. Türkçe bir sitede bu gözle görülür bir
 * kırıklıktır ve tam da fark edilmesi en zor hata türüdür — İngilizce test
 * metniyle bakan biri asla göremez.
 *
 * display:"swap" + next/font'un ürettiği size-adjust'lı yerel yedek: font
 * inerken metin görünür kalır, indiğinde sayfa zıplamaz.
 *
 * italic BİLEREK yüklenmiyor: içerik JSON'unda vurgu işaretlemesi yok
 * (`grep -rn "italic|<em>"` boş döndü), yüklenseydi hiç kullanılmayan bir
 * dosya indirilecekti.
 */
const literata = Literata({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-literata",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-hanken",
});

const siteCover = {
  url: coverPath(SITE_COVER_SLUG),
  width: COVER_SIZE.width,
  height: COVER_SIZE.height,
  alt: "Bitki Akademisi — Şifalı Bitkiler Rehberi",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Bitki Akademisi — Şifalı Bitkiler Rehberi",
    template: "%s | Bitki Akademisi",
  },
  description:
    "Hangi bitki neye iyi gelir? Şifalı bitkiler, bitkisel ekstraktlar ve doğal sağlık hakkında güvenilir, bilimsel temelli rehberler.",
  keywords: [
    "şifalı bitkiler",
    "bitkisel takviye",
    "hangi bitki neye iyi gelir",
    "bitkisel ekstrakt",
    "doğal sağlık",
    "bitki akademisi",
  ],
  // Site geneli varsayılan paylaşım kartı. Makale sayfaları kendi
  // openGraph.images'ini verdiği için bunu EZER; burada tanımlı olması
  // yalnızca kendi kartı olmayan sayfaları (anasayfa, hakkında, liste)
  // görselsiz bırakmamak için.
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: "Bitki Akademisi",
    title: "Bitki Akademisi — Şifalı Bitkiler Rehberi",
    description:
      "Hangi bitki neye iyi gelir? Şifalı bitkiler, bitkisel ekstraktlar ve doğal sağlık hakkında güvenilir, bilimsel temelli rehberler.",
    images: [siteCover],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bitki Akademisi — Şifalı Bitkiler Rehberi",
    description:
      "Hangi bitki neye iyi gelir? Şifalı bitkiler, bitkisel ekstraktlar ve doğal sağlık hakkında güvenilir, bilimsel temelli rehberler.",
    images: [siteCover],
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Site geneli entity grafiği. Tek bir @graph içinde yayımlanır ki motorlar
  // Organization / WebSite / İmmu-Nat arasındaki ilişkiyi tek okumada çözsün.
  // Blog yazılarındaki Article şeması bu @id'lere referans verir.
  const siteGraph = {
    "@context": "https://schema.org",
    "@graph": [organizationSchema(), webSiteSchema(), immuNatBrandSchema()],
  };

  return (
    <html lang="tr" className={`${literata.variable} ${hanken.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteGraph) }}
        />
      </head>
      {/* Zemin, metin rengi ve varsayılan aile globals.css'te tanımlı —
          burada tekrar edilirse iki kaynak ayrışır. */}
      <body className="antialiased">
        {/* flex-wrap ZORUNLU: logo + dört bağlantı 375px'e sığmıyor
            (ölçüldü ~470px). Sarmalama olmadan nav ya taşıyor ya da
            bağlantılar birbirine yapışıyor. Mobilde menüyü gizlemek yerine
            ikinci satıra indiriyoruz — dört bağlantının dördü de gerekli. */}
        <header className="border-b border-stone-200 bg-white">
          <div className="wide-column flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
            <Link
              href="/"
              className="font-serif text-h3 font-bold text-emerald-800"
            >
              🌿 Bitki Akademisi
            </Link>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-meta font-semibold text-stone-600">
              <Link href="/" className="hover:text-emerald-700">
                Anasayfa
              </Link>
              <Link href="/blog" className="hover:text-emerald-700">
                Rehberler
              </Link>
              <Link href="/urunler" className="hover:text-emerald-700">
                Tüm Ürünler
              </Link>
              <Link href="/hakkinda" className="hover:text-emerald-700">
                Hakkında
              </Link>
            </nav>
          </div>
        </header>
        {children}
        {/* Alt bilgi SOLA hizalı. Ortalanmış çok satırlı metinde her satırın
            başlangıcı farklı yerde olur; göz her satırda yeniden yer arar.
            İki cümlelik yasal bir uyarıda bunun bedeli küçük değil — burası
            YMYL içeriğinde okunması en gereken yazı. */}
        <footer className="mt-20 border-t border-stone-200 bg-white py-12">
          <div className="reading-column space-y-3 font-sans text-meta text-stone-500">
            <p>
              Tüm içerikler bilgilendirme amaçlıdır, tıbbi tavsiye yerine
              geçmez. Hastalık teşhis, tedavi veya önleme iddiası içermez.
            </p>
            <p>
              Bitki Akademisi bağımsız bir içerik sitesidir ve ürün
              yönlendirmelerinde İmmu-Nat markasının Amazon.com.tr sayfalarına
              bağlantı verir.{" "}
              <Link
                href="/hakkinda"
                className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
              >
                Editoryal politika
              </Link>
              .
            </p>
            <p className="pt-2">© {new Date().getFullYear()} Bitki Akademisi</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
