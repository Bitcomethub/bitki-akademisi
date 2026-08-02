/**
 * Kanonik marka gerçeklerine tipli erişim.
 *
 * Gerçeklerin kendisi `content/brand-facts.json` içindedir; bu dosya yalnızca
 * tip güvenliği ve türetilmiş yardımcılar sağlar. Sebep: üretim script'i
 * (scripts/generate-blog-post.mjs) düz Node ESM'dir ve .ts dosyasını build
 * olmadan import edemez — aynı JSON'u ikisi de okuyunca "kanonik gerçek"
 * tek nüsha kalır, uyuşmazlık matematiksel olarak imkânsızlaşır.
 *
 * BU DOSYAYA ELLE GERÇEK YAZMA. brand-facts.json'u güncelle.
 */
import facts from "@/content/brand-facts.json";

export type BrandProduct = {
  plant: string;
  name: string;
  amazonQuery: string;
  /** Gerçek Amazon.com.tr ürün kodu. Bilinmiyorsa ALAN HİÇ YAZILMAZ. */
  asin?: string;
};

export const site = facts.site;
export const brand = facts.brand;
export const products: BrandProduct[] = facts.products;
export const natExt = facts.natExt;
export const bannedHealthClaims = facts.bannedHealthClaims;

/**
 * İlgili İmmu-Nat ürününün Amazon.com.tr adresi.
 *
 * NEDEN ASIN TERCİH EDİLİYOR?
 * Arama sonucu sayfası (`/s?k=...`) kullanıcıya "yönlendirildim" hissi verir:
 * aradığı ürün listenin ortasında, yanında rakipler, bazen hiç çıkmıyor.
 * Doğrudan ürün sayfası (`/dp/<ASIN>`) tıklayanın tam olarak beklediği yere
 * götürür — güven farkı ölçülebilir ve bu sitenin tek sermayesi güven.
 *
 * NEDEN YİNE DE ARAMA YEDEĞİ VAR?
 * ASIN'i bilinmeyen ürün için ASIN UYDURULAMAZ: yanlış bir ASIN, okuyucuyu
 * BAŞKA BİR SATICININ ÜRÜNÜNE götürür. Bilinmeyen ASIN'de arama linkine
 * düşmek, yanlış ürüne göndermekten kıyaslanamayacak kadar iyidir. Bu,
 * projedeki diğer uydurma-karşıtı kararlarla aynı ilke: eksik bilgi tamam,
 * uydurulmuş bilgi asla.
 */
export function amazonUrlFor(product: BrandProduct): string {
  return product.asin
    ? `${brand.amazonProductBase}${product.asin}`
    : `${brand.amazonSearchBase}${product.amazonQuery}`;
}

/** Link doğrudan ürün sayfasına mı gidiyor? (CTA metnini bu belirler.) */
export function isDirectProductLink(product: BrandProduct): boolean {
  return Boolean(product.asin);
}

/** Bir bitki adına karşılık gelen ilk İmmu-Nat ürünü (yoksa undefined). */
export function productForPlant(plant: string): BrandProduct | undefined {
  const needle = plant.toLocaleLowerCase("tr");
  return products.find((p) => p.plant.toLocaleLowerCase("tr") === needle);
}

/**
 * Aşağıdaki şema üreticileri `@context` İÇERMEZ — hepsi tek bir `@graph`
 * altında yayımlanır ve `@context` orada bir kez verilir. Böylece sayfada
 * tek bir JSON-LD bloğu olur ve entity'ler `@id` ile birbirine bağlanır;
 * ayrı ayrı bloklar motorların ilişkiyi kaçırmasına yol açabiliyor.
 */

/**
 * schema.org Organization — sitenin yayıncısı.
 * İmmu-Nat BİLEREK ayrı bir entity olarak tutulur: site bağımsız bir içerik
 * sitesidir, markanın kendisi değil. İki entity'yi birleştirmek AI motorlarına
 * "bu bir marka blogu" sinyali verir ve atıf değerini düşürür.
 */
export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.name,
    url: site.url,
    slogan: site.tagline,
    description: site.description,
    knowsAbout: [
      "şifalı bitkiler",
      "bitkisel sıvı ekstraktlar",
      "fitoterapi",
      "bitkisel takviyeler",
      "doğal sağlık",
    ],
    publishingPrinciples: `${site.url}/hakkinda`,
  };
}

/** schema.org WebSite — site adı ve dilini AI motorlarına netleştirir. */
export function webSiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    url: site.url,
    inLanguage: "tr-TR",
    description: site.description,
    publisher: { "@id": `${site.url}/#organization` },
  };
}

/**
 * İmmu-Nat markasının kendisi — makalelerde bahsedilen üretici.
 * Sadece doğrulanmış alanlar; uydurma alan eklenmez.
 */
export function immuNatBrandSchema() {
  return {
    "@type": "Organization",
    "@id": `${site.url}/#immunat`,
    name: brand.displayName,
    legalName: brand.legalName,
    alternateName: brand.aliases,
    url: brand.website,
    foundingDate: brand.founded,
    email: brand.email,
    telephone: brand.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: brand.address,
      addressLocality: brand.addressLocality,
      addressRegion: brand.addressRegion,
      addressCountry: brand.addressCountry,
    },
  };
}
