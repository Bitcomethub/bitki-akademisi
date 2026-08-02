import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://bitkiakademisi.com";

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
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: "Bitki Akademisi",
    title: "Bitki Akademisi — Şifalı Bitkiler Rehberi",
    description:
      "Hangi bitki neye iyi gelir? Şifalı bitkiler, bitkisel ekstraktlar ve doğal sağlık hakkında güvenilir, bilimsel temelli rehberler.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bitki Akademisi — Şifalı Bitkiler Rehberi",
    description:
      "Hangi bitki neye iyi gelir? Şifalı bitkiler, bitkisel ekstraktlar ve doğal sağlık hakkında güvenilir, bilimsel temelli rehberler.",
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
  return (
    <html lang="tr">
      <body className="antialiased bg-stone-50 text-stone-900">
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight text-emerald-800">
              🌿 Bitki Akademisi
            </a>
            <nav className="flex gap-6 text-sm font-medium text-stone-600">
              <a href="/" className="hover:text-emerald-700">
                Anasayfa
              </a>
              <a href="/blog" className="hover:text-emerald-700">
                Rehberler
              </a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="border-t border-stone-200 mt-16 py-10 text-center text-sm text-stone-500">
          <p>© {new Date().getFullYear()} Bitki Akademisi. Tüm içerikler bilgilendirme amaçlıdır, tıbbi tavsiye yerine geçmez.</p>
        </footer>
      </body>
    </html>
  );
}
