import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import {
  organizationSchema,
  webSiteSchema,
  immuNatBrandSchema,
} from "@/lib/brand-facts";
import { COVER_SIZE, SITE_COVER_SLUG, coverPath } from "@/lib/cover";

const siteUrl = "https://bitkiakademisi.com";

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
    <html lang="tr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteGraph) }}
        />
      </head>
      <body className="antialiased bg-stone-50 text-stone-900">
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight text-emerald-800">
              🌿 Bitki Akademisi
            </Link>
            <nav className="flex gap-6 text-sm font-medium text-stone-600">
              <Link href="/" className="hover:text-emerald-700">
                Anasayfa
              </Link>
              <Link href="/blog" className="hover:text-emerald-700">
                Rehberler
              </Link>
              <Link href="/hakkinda" className="hover:text-emerald-700">
                Hakkında
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="border-t border-stone-200 mt-16 py-10 px-4 text-center text-sm text-stone-500">
          <p className="max-w-2xl mx-auto mb-3">
            Tüm içerikler bilgilendirme amaçlıdır, tıbbi tavsiye yerine geçmez.
            Hastalık teşhis, tedavi veya önleme iddiası içermez.
          </p>
          <p className="max-w-2xl mx-auto mb-3">
            Bitki Akademisi bağımsız bir içerik sitesidir ve ürün
            yönlendirmelerinde İmmu-Nat markasının Amazon.com.tr sayfalarına
            bağlantı verir.{" "}
            <Link href="/hakkinda" className="text-emerald-700 hover:underline">
              Editoryal politika
            </Link>
            .
          </p>
          <p>© {new Date().getFullYear()} Bitki Akademisi</p>
        </footer>
      </body>
    </html>
  );
}
