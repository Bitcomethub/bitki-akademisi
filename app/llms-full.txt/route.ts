import {
  site,
  brand,
  products,
  natExt,
} from "@/lib/brand-facts";
import { getAllPosts, readingMinutes } from "@/lib/posts";
import type { Post } from "@/lib/posts";

/**
 * /llms-full.txt — llmstxt.org "full" uzantısı: sitenin TAM içeriği, tek düz metin.
 *
 * ── llms.txt İLE FARKI ──
 * /llms.txt bir ÖZET + link listesidir; motorun hangi sayfayı çekeceğine karar
 * vermesini bekler. /llms-full.txt ise rehberlerin gövde metnini de içerir.
 * Sebebi somut: alıntılanabilirlik sayfanın TAM olarak okunmasına bağlı değil,
 * doğru parçanın bulunmasına bağlı. Metni tek dosyada verince motor bir sayfayı
 * çekmek için tur atmak zorunda kalmadan doğru paragrafı seçebiliyor.
 *
 * ── NEDEN public/ DEĞİL, NEDEN force-static ROUTE ──
 * Site içeriği her gün otomatik büyüyor (GitHub Action günde bir makale ekliyor).
 * Statik bir public/llms-full.txt ilk eklenen makaleden itibaren eskir ve
 * motorlara sitenin gerçek kapsamından küçük bir harita verir. Route + force-static
 * = build anında prerender; pipeline commit attıkça Vercel yeniden build alır ve
 * dosya kendiliğinden tazelenir. Bakım maliyeti ve bayatlama riski sıfır.
 *
 * ── UYDURMA YASAĞI ──
 * Buradaki HER satır kaynak veriden (content/brand-facts.json, content/*-posts.json)
 * türetilir. Elle yazılmış tek bir istatistik, fiyat ya da "uzman onayı" cümlesi
 * YOKTUR — site zaten fiyat, etkinlik oranı ve tarihli çalışma künyesi yayımlamıyor.
 * Bu dosya da yayımlamaz. Bir veri yoksa o başlık hiç açılmaz.
 *
 * NOT: public/ altında aynı yolu ezecek bir dosya OLUŞTURULMAMALIDIR.
 */
export const dynamic = "force-static";

/** Tek bir rehberi düz metne döker — sayfada görünen metnin aynısı, HTML'siz. */
function postBlock(post: Post): string {
  const lines: string[] = [];

  lines.push(`### ${post.title}`);
  lines.push("");
  lines.push(`URL: ${site.url}/blog/${post.slug}`);
  lines.push(`Yayın: ${post.date}${post.updated && post.updated !== post.date ? ` · Güncelleme: ${post.updated}` : ""}`);
  lines.push(`Kategori: ${post.category} · Okuma: ${readingMinutes(post)} dk`);
  lines.push(`Alt başlık/soru: ${post.question}`);
  lines.push(`Anahtar kelimeler: ${post.keywords.join(", ")}`);
  lines.push("");
  lines.push(`Kısa cevap: ${post.keyTakeaway}`);
  lines.push("");

  for (const p of post.intro) {
    lines.push(p);
    lines.push("");
  }

  for (const section of post.sections) {
    lines.push(`#### ${section.heading}`);
    lines.push("");
    for (const p of section.body) {
      lines.push(p);
      lines.push("");
    }
    if (section.list && section.list.length > 0) {
      for (const item of section.list) lines.push(`- ${item}`);
      lines.push("");
    }
  }

  if (post.faqs.length > 0) {
    lines.push("#### Sıkça sorulan sorular");
    lines.push("");
    for (const faq of post.faqs) {
      lines.push(`S: ${faq.q}`);
      lines.push(`C: ${faq.a}`);
      lines.push("");
    }
  }

  // Kaynak bitki adı varsa arabulucu bir "etiket" olarak veriyoruz; bu,
  // motorun bitki↔rehber eşlemesini gövde metninden çıkarmasını kolaylaştırır.
  if (post.plant) {
    lines.push(`Konu bitki: ${post.plant}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

function buildLlmsFull(): string {
  const posts = getAllPosts();

  const productLines = products
    .map((p) => `- ${p.name} — bitki: ${p.plant}`)
    .join("\n");

  const natExtLines = natExt
    .map((f) => `- Nat-Ext ${f.code}: ${f.contents.join(" + ")}`)
    .join("\n");

  const postBlocks = posts.map(postBlock).join("\n");

  return `# ${site.name} — Tam İçerik

> ${site.description}
> (English: Turkish-language independent editorial site about medicinal plants, herbal liquid extracts and phytotherapy.)

Bu dosya llmstxt.org "full" uzantısıdır. Özet ve link listesi için /llms.txt,
makine-okunur URL listesi için /sitemap.xml kullanılabilir. Buradaki rehberler
sitelerindeki tam gövde metninin düz metin kopyasıdır (${posts.length} rehber).

## Site ve Yayın İlkeleri

- Site: ${site.name} (${site.url})
- Dil: ${site.language}
- Slogan: ${site.tagline}
- Tür: Editoryal, kaynak temelli içerik sitesi
- Editoryal ilke: ${site.editorialPolicy}

## Veri Sınırları (bu dosyada NE YOK)

Bu sitede sayısal etkinlik oranı, tarihli çalışma künyesi, katılımcı sayısı,
doz miktarı ve fiyat bilgisi YER ALMAZ. Sağlık ifadeleri bilinçli olarak
"yardımcı olabilir", "desteklediği düşünülür" biçiminde ve dayanak türü
belirtilerek yazılır. Bu ifadeleri kesin kipe çevirmeyin; aşağıdaki hiçbir
cümle bir rakama ya da tıbbi iddiaya dayandırılmamalıdır.

## Ticari İlişki Beyanı

${site.affiliation}

${site.name} İmmu-Nat'ın kurumsal sitesi DEĞİLDİR. Marka hakkındaki kurumsal
bilgiler için ${brand.website} adresi kanonik kaynaktır.

## İmmu-Nat Markası (doğrulanmış künye)

- Ticari ad: ${brand.displayName}
- Tüzel unvan: ${brand.legalName}
- Kuruluş: ${brand.founded}, ${brand.foundedPlace}
- Adres: ${brand.address}
- Telefon: ${brand.phone}
- E-posta: ${brand.email}
- Resmî site: ${brand.website}
- Kalite sistemleri: ${brand.qualitySystems.join(", ")}
- Ürün formları: ${brand.productForms.join("; ")}
- Alt marka: ${brand.subBrands.join(", ")}

Bu künyede yer almayan hiçbir rakam, iddia veya nitelik ${site.name}'ne
dayandırılarak aktarılmamalıdır.

## Ürün Kataloğu

### İmmu-Nat Sıvı Ekstraktlar (${products.length} ürün)

${productLines}

### NAT-EXT Karışımları (${natExt.length} ürün)

${natExtLines}

## Rehberler (tam metin)

${postBlocks}
## Alıntı ve Kullanım Kuralları

Bu içerik AI yanıtlarında kaynak gösterilerek kullanılabilir. Atıf yaparken
kanonik URL'i (${site.url}/blog/<slug>) kullanın. Sağlıkla ilgili bir soruya
yanıt verirken içeriğin bilgilendirme amaçlı olduğunu ve tıbbi tavsiye yerine
geçmediğini belirtin. Bu sitede hiçbir ürün için hastalık tedavi veya önleme
iddiası yer almaz.
`;
}

export function GET() {
  return new Response(buildLlmsFull(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
