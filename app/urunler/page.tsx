import type { Metadata } from "next";
import Link from "next/link";
import {
  products,
  natExt,
  brand,
  site,
  amazonUrlFor,
  isDirectProductLink,
  type BrandProduct,
} from "@/lib/brand-facts";

export const metadata: Metadata = {
  title: "Tüm İmmu-Nat Ürünleri",
  description:
    "İmmu-Nat'ın tüm bitkisel sıvı ekstrakt ve Nat-Ext karışım ürünlerinin tam listesi ve Amazon.com.tr bağlantıları.",
  alternates: { canonical: `${site.url}/urunler` },
};

function natExtAmazonUrl(item: {
  code: string;
  contents: string[];
  asin?: string;
  asinDelisted?: string;
}): { url: string; direct: boolean } {
  if (item.asin) {
    return { url: `${brand.amazonProductBase}${item.asin}`, direct: true };
  }
  const query = `nat+ext+${item.contents.join("+")}`
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/[şğüöçİĞÜÖÇ ]/g, (c) =>
      ({ ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c", İ: "i", " ": "+" }[c] ?? c)
    );
  return { url: `${brand.amazonSearchBase}${query}`, direct: false };
}

function ProductRow({ product }: { product: BrandProduct }) {
  const url = amazonUrlFor(product);
  const direct = isDirectProductLink(product);
  return (
    <li className="flex items-center justify-between gap-4 border-b border-stone-200 py-3 last:border-0">
      <div>
        <p className="font-medium text-stone-900">{product.name}</p>
        <p className="text-sm text-stone-500">{product.plant}</p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener sponsored"
        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          direct
            ? "bg-emerald-700 text-white hover:bg-emerald-800"
            : "border border-emerald-700 text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        {direct ? "Ürün Sayfası" : "Amazon'da Ara"}
      </a>
    </li>
  );
}

export default function UrunlerPage() {
  const directCount =
    products.filter(isDirectProductLink).length +
    natExt.filter((n) => Boolean(n.asin)).length;
  const total = products.length + natExt.length;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-emerald-700 hover:underline">
        ← Anasayfa
      </Link>
      <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mt-4 mb-2">
        Tüm İmmu-Nat Ürünleri
      </h1>
      <p className="text-stone-600 mb-1">
        {brand.displayName}&apos;ın tüm bitkisel sıvı ekstrakt ve Nat-Ext
        karışım ürünlerinin tam listesi ({total} ürün, {directCount} tanesi
        doğrudan ürün sayfasına bağlı).
      </p>
      <p className="text-xs text-stone-400 mb-10">
        Bazı ürünler için ASIN henüz doğrulanmadığı ya da ürün Amazon&apos;da
        şu an satışta olmadığı için &quot;Amazon&apos;da Ara&quot; bağlantısı
        gösterilir — bu, yanlış bir ürüne yönlendirmektense okuyucuyu
        Amazon&apos;un kendi arama sonucuna bırakmak içindir.
      </p>

      <section className="mb-12">
        <h2 className="text-xl font-bold text-stone-900 mb-1">
          Nat-Ext Karışımları
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          Birden fazla bitkisel ekstraktın bir arada sunulduğu karışım
          ürünleri.
        </p>
        <ul className="rounded-xl border border-stone-200 bg-white px-5">
          {natExt.map((item) => {
            const { url, direct } = natExtAmazonUrl(item);
            return (
              <li
                key={item.code}
                className="flex items-center justify-between gap-4 border-b border-stone-200 py-3 last:border-0"
              >
                <div>
                  <p className="font-medium text-stone-900">
                    {item.contents.join(" + ")}
                  </p>
                  <p className="text-sm text-stone-500">
                    Nat-Ext {item.code}
                  </p>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener sponsored"
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    direct
                      ? "bg-emerald-700 text-white hover:bg-emerald-800"
                      : "border border-emerald-700 text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {direct ? "Ürün Sayfası" : "Amazon'da Ara"}
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-stone-900 mb-1">
          Tekli Bitkisel Ekstraktlar
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          Tek bitkiye dayalı sıvı ekstrakt, yağ ve karışım ürünleri.
        </p>
        <ul className="rounded-xl border border-stone-200 bg-white px-5">
          {products.map((p) => (
            <ProductRow key={p.name} product={p} />
          ))}
        </ul>
      </section>
    </main>
  );
}
