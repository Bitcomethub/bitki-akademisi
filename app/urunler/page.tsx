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
  type NatExtFormula,
} from "@/lib/brand-facts";

export const metadata: Metadata = {
  title: "Tüm İmmu-Nat Ürünleri",
  description:
    "İmmu-Nat'ın tüm bitkisel sıvı ekstrakt ve Nat-Ext karışım ürünlerinin tam listesi ve Amazon.com.tr bağlantıları.",
  alternates: { canonical: `${site.url}/urunler` },
};

function natExtAmazonUrl(item: NatExtFormula): { url: string; direct: boolean } {
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

function AmazonCta({ url, direct }: { url: string; direct: boolean }) {
  return (
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
  );
}

/**
 * Kart: [ad + künye | bağlantı] üstte, açıklama altta.
 *
 * Açıklama satırı KOŞULLU. Metin yalnızca kalite kapısından geçtiyse JSON'a
 * yazılıyor; geçemeyen ürün alansız kalıyor. Bu yüzden arayüz "açıklama yok"
 * halini normal bir durum olarak render eder — boş bir yer tutucu ya da
 * "açıklama bekleniyor" yazısı göstermek, eksikliği hataya çevirirdi.
 *
 * Açıklama başlığın ALTINDA çünkü kartın işi önce ürünü teşhis etmek: gözü
 * gezdiren okuyucu adı tarar, ilgisini çekeni okur.
 */
function ProductCard({
  title,
  subtitle,
  blurb,
  url,
  direct,
}: {
  title: string;
  subtitle: string;
  blurb?: string;
  url: string;
  direct: boolean;
}) {
  return (
    <li className="border-b border-stone-200 py-4 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-stone-900">{title}</p>
          <p className="text-sm text-stone-500">{subtitle}</p>
        </div>
        <AmazonCta url={url} direct={direct} />
      </div>
      {blurb && (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-stone-600">
          {blurb}
        </p>
      )}
    </li>
  );
}

function ProductRow({ product }: { product: BrandProduct }) {
  return (
    <ProductCard
      title={product.name}
      subtitle={product.plant}
      blurb={product.kisaFayda}
      url={amazonUrlFor(product)}
      direct={isDirectProductLink(product)}
    />
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
      <p className="text-xs text-stone-400 mb-10">
        Ürün açıklamaları bitkilerin <strong>geleneksel kullanım alanlarını</strong>{" "}
        anlatır; tedavi, teşhis ya da tıbbi tavsiye değildir. Her açıklama
        yayımlanmadan önce yasaklı sağlık iddiaları, uydurulmuş istatistik ve
        doğrulanmamış bileşen adlarına karşı otomatik olarak denetlenir.
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
              <ProductCard
                key={item.code}
                title={item.contents.join(" + ")}
                subtitle={`Nat-Ext ${item.code}`}
                blurb={item.nedenBuKarisim}
                url={url}
                direct={direct}
              />
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
