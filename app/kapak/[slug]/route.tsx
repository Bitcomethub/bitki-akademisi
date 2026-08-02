/**
 * /kapak/<slug>.png — makale paylaşım kartı (1200×630 PNG).
 *
 * NEDEN DOSYA KURALI (opengraph-image.tsx) DEĞİL DE AÇIK ROTA?
 * Next'in opengraph-image kuralı meta etiketlerini otomatik yazar ama URL'e
 * önbellek kırıcı bir hash ekler: /blog/x/opengraph-image?abc123. O URL'i
 * sayfadan ya da JSON-LD'den güvenle referans veremezsin. Bize TEK ve KARARLI
 * bir adres lazım, çünkü aynı görsel üç yerde birden kullanılıyor:
 * og:image, twitter:image ve Article şemasının image alanı. Üçünün aynı URL'i
 * göstermesi, motorların makaleyi tek bir görsel varlıkla eşleştirmesini sağlar.
 *
 * NEDEN force-static + dynamicParams = false?
 * force-static: PNG'ler build anında üretilip statik dosya olarak servis edilir
 * — çalışma zamanında tek bir fonksiyon çağrısı yok, dolayısıyla maliyet ve
 * gecikme yok. dynamicParams = false: listede olmayan bir slug 404 döner.
 * Böylece /kapak/uydurma-yazi.png diye bir adres ASLA görsel üretmez; kapak
 * yalnızca gerçekten yayımlanmış bir makale için var olabilir.
 *
 * NEDEN .png UZANTISI SEGMENTİN İÇİNDE?
 * Rota parçası "zerdecal-faydalari-nelerdir.png" olarak üretiliyor, uzantı
 * ayrı bir segment değil. Content-Type doğru olduğu için teknik olarak
 * uzantısız da çalışırdı; ama bazı sosyal medya kazıyıcıları ve görsel
 * indeksleyiciler uzantıya bakarak ön eleme yapıyor. Bedava sigorta.
 *
 * FONT NOTU: next/og'un gömülü fontu Geist. Türkçe için kritik olan ğ Ğ ş Ş ı İ
 * kod noktalarının Geist'in cmap tablosunda BULUNDUĞU doğrulandı — bu yüzden
 * ayrıca font gömmüyoruz. (Google Fonts'un "latin" alt kümesi ı içerir ama
 * ğ ve ş İÇERMEZ; oradan bir font alsaydık "Zerdeçal" ve "Karabaş Otu" gibi
 * adlar boş kutu olarak render edilirdi.) Tek ağırlık gömülü olduğu için
 * hiyerarşi kalınlıkla değil, punto ve saydamlıkla kuruluyor.
 */
import { ImageResponse } from "next/og";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import {
  COVER_SIZE,
  SITE_COVER_SLUG,
  coverVariant,
  paletteFor,
} from "@/lib/cover";
// site (Bitki Akademisi) — brand (İmmu-Nat) DEĞİL. Kapak kartını takviye
// markasının adıyla imzalamak, sitenin bağımsız otorite konumlandırmasını
// ters çevirirdi; kart bir reklam görseline dönerdi.
import { site } from "@/lib/brand-facts";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [
    { slug: `${SITE_COVER_SLUG}.png` },
    ...getAllPosts().map((post) => ({ slug: `${post.slug}.png` })),
  ];
}

/**
 * Uzun başlık kapağın dışına taşmasın diye punto başlık uzunluğuna göre
 * küçülüyor. Satori satır kırpmayı (line-clamp) güvenilir desteklemediğinden
 * çözüm ölçüde: 3 satıra sığdığı bilinen punto/karakter eşikleri.
 */
function titleSize(title: string): number {
  if (title.length <= 42) return 66;
  if (title.length <= 62) return 56;
  if (title.length <= 84) return 48;
  return 42;
}

type Card = {
  eyebrow: string;
  title: string;
  footnote: string;
  category: string;
  slug: string;
};

function cardFor(slug: string): Card | null {
  if (slug === SITE_COVER_SLUG) {
    return {
      eyebrow: "Şifalı Bitkiler Rehberi",
      title: site.tagline,
      footnote: site.url.replace(/^https?:\/\//, ""),
      category: "Bağışıklık",
      slug: SITE_COVER_SLUG,
    };
  }

  const post = getPostBySlug(slug);
  if (!post) return null;

  return {
    eyebrow: post.category,
    // Kartta SEO başlığı değil SORU var: paylaşım kartını gören insan da,
    // kartı okuyan motor da "bu sayfa şu soruyu cevaplıyor" bilgisini alıyor.
    // Başlık zaten og:title'da; kartta tekrarlamak yer israfı olurdu.
    title: post.question,
    footnote: post.plant ?? post.category,
    category: post.category,
    slug: post.slug,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: file } = await params;
  const slug = file.replace(/\.png$/, "");
  const card = cardFor(slug);

  if (!card) {
    return new Response("Kapak bulunamadı", { status: 404 });
  }

  const palette = paletteFor(card.category);
  const variant = coverVariant(card.slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
          padding: 72,
          color: "#ffffff",
          backgroundImage: `linear-gradient(${variant.angle}deg, ${palette.from} 0%, ${palette.to} 100%)`,
        }}
      >
        {/* Yaprak motifi: köşegen border-radius bir kareyi yaprağa çevirir.
            Satori'de SVG path desteği kısıtlı, bu yol hem güvenli hem ucuz.
            Döndürme şart — bkz. coverVariant.motifRotate açıklaması. */}
        <div
          style={{
            position: "absolute",
            top: variant.motifTop,
            left: variant.motifLeft,
            width: 520,
            height: 520,
            borderRadius: "100% 0 100% 0",
            backgroundColor: palette.accent,
            opacity: 0.16,
            transform: `rotate(${variant.motifRotate}deg)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: variant.motifTop + 210,
            left: variant.motifLeft + 150,
            width: 300,
            height: 300,
            borderRadius: "100% 0 100% 0",
            backgroundColor: palette.accent,
            opacity: 0.12,
            transform: `rotate(${variant.motifRotate - 18}deg)`,
          }}
        />

        {/* Alt karartma. Degradenin açık ucu kartın neresine düşerse düşsün
            alt bilgi çubuğu beyaz metinle okunur kalsın diye. Paleti
            koyultmak tek başına yetmiyordu: degrade açısı slug'a göre
            değiştiği için en açık bölge bazen tam alt köşeye geliyor. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 320,
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 100%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              padding: "10px 26px",
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.35)",
              fontSize: 26,
              letterSpacing: 1.5,
            }}
          >
            {card.eyebrow.toLocaleUpperCase("tr")}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: titleSize(card.title),
            lineHeight: 1.22,
            letterSpacing: -1,
            maxWidth: 900,
          }}
        >
          {card.title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.35)",
            paddingTop: 28,
            fontSize: 28,
          }}
        >
          <div style={{ display: "flex", letterSpacing: 2 }}>
            {site.name.toLocaleUpperCase("tr")}
          </div>
          <div style={{ display: "flex", opacity: 0.85 }}>{card.footnote}</div>
        </div>
      </div>
    ),
    { ...COVER_SIZE },
  );
}
