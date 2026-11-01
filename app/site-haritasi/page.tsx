import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/brand-facts";
import { sitemapEntries } from "../sitemap";

export const metadata: Metadata = {
  title: "Site Haritası — Tüm Rehberler ve Sayfalar",
  description:
    "Bitki Akademisi'ndeki bütün sayfalar tek listede: bitki rehberleri, ürün sayfası ve künye. Liste, XML site haritasıyla aynı kaynaktan üretilir.",
  alternates: { canonical: "/site-haritasi" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${site.url}/site-haritasi#page`,
      url: `${site.url}/site-haritasi`,
      name: "Site Haritası — Bitki Akademisi",
      inLanguage: "tr-TR",
      isPartOf: { "@id": `${site.url}/#website` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${site.url}/site-haritasi#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Anasayfa", item: site.url },
        { "@type": "ListItem", position: 2, name: "Site Haritası" },
      ],
    },
  ],
};

/**
 * `/site-haritasi` — `/sitemap.xml`in okunabilir hâli.
 *
 * Liste `sitemapEntries()`ten geliyor; ikinci bir elle yazılmış adres listesi
 * YOK. Yeni bir yazı eklendiğinde XML ve HTML indeks aynı anda güncellenir.
 */
export default function SiteHaritasiPage() {
  const paths = sitemapEntries().map((entry) => new URL(entry.url).pathname);

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-stone-500 mb-6">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-emerald-700">
              Anasayfa
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Site Haritası</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-stone-900">
        Site Haritası
      </h1>
      <p className="mt-3 max-w-2xl text-stone-600">
        Sitedeki bütün sayfalar tek listede. Liste, XML site haritasıyla aynı
        kaynaktan üretilir.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-x-10 gap-y-2 sm:grid-cols-2">
        {paths.map((path) => (
          <li key={path}>
            <Link
              href={path}
              className="inline-flex text-sm text-stone-700 transition-colors hover:text-emerald-700"
            >
              {path}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
