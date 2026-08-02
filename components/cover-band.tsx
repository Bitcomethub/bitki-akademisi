/**
 * Sayfa içi kapak şeridi.
 *
 * NEDEN /kapak/<slug>.png BURADA <img> OLARAK KULLANILMIYOR?
 * Üç sebep:
 *
 * 1. TEKRAR. PNG'nin üzerinde makalenin sorusu yazıyor. Rehber listesinde
 *    kartın başlığı zaten o soruyu içeriyor, makale sayfasında ise soru
 *    "Kısa cevap" kutusunun H2'si. Aynı cümleyi görselde bir daha basmak
 *    şablon işi gibi görünür.
 * 2. MALİYET. Backlog 128 makale; liste sayfası zamanla 128 PNG isteği
 *    demek. Şerit saf CSS: sıfır istek, sıfır bayt, sıfır layout kayması.
 * 3. BİLGİ. Şerit sorunun tekrarı yerine BİTKİ ADINI taşıyor — kartta zaten
 *    olmayan bir bilgi. Görsel süs değil, ayırt edici oluyor.
 *
 * PNG'nin işi ayrı: paylaşım kartı (og:image, twitter:image) ve Article
 * şemasının image alanı. Orada metin şart, çünkü kartı gören insan sayfayı
 * henüz açmamıştır.
 *
 * Degrade rengi Tailwind sınıfıyla verilemez: renkler çalışma zamanında
 * kategoriden geliyor, Tailwind ise sınıf adlarını kaynak kodda statik olarak
 * tarar — `bg-[${palette.from}]` derlenmez, sessizce kaybolur. Dinamik renk
 * için doğru kaçış yolu inline style.
 */
import { coverVariant, paletteFor } from "@/lib/cover";

type Props = {
  slug: string;
  category: string;
  plant?: string;
  /** hero: makale sayfası başlığı. card: liste kartı. */
  size?: "hero" | "card";
};

export function CoverBand({ slug, category, plant, size = "card" }: Props) {
  const palette = paletteFor(category);
  const variant = coverVariant(slug);
  const isHero = size === "hero";

  return (
    <div
      // Dekoratif: etiket metni zaten sayfada kategori rozetinde ve başlıkta
      // var, ekran okuyucuya aynı bilgiyi üçüncü kez okutmanın anlamı yok.
      aria-hidden="true"
      // card varyantı köşe yuvarlaması YAPMAZ ve negatif margin KULLANMAZ:
      // kartın kendi padding'ini tahmin eden bir bileşen, padding değiştiği
      // gün sessizce bozulur. Yuvarlamayı saran kart `overflow-hidden` ile
      // hallediyor — şerit hangi kartın içinde olduğunu bilmek zorunda değil.
      className={`relative overflow-hidden ${
        isHero ? "h-40 md:h-52 rounded-2xl" : "h-24"
      }`}
      style={{
        backgroundImage: `linear-gradient(${variant.angle}deg, ${palette.from} 0%, ${palette.to} 100%)`,
      }}
    >
      {/* Yaprak motifi — kapak PNG'siyle aynı biçim dili, aynı slug'dan
          türeyen aynı yerleşim. Kart ile paylaşım görseli akraba görünür. */}
      <span
        className="absolute block"
        style={{
          top: isHero ? variant.motifTop / 4 : variant.motifTop / 7,
          left: `${(variant.motifLeft / 1200) * 100}%`,
          width: isHero ? 220 : 130,
          height: isHero ? 220 : 130,
          borderRadius: "100% 0 100% 0",
          backgroundColor: palette.accent,
          opacity: 0.18,
          transform: `rotate(${variant.motifRotate}deg)`,
        }}
      />
      {/* Kapak PNG'siyle aynı karartma: şeridin sol altındaki bitki adı,
          degradenin açık ucu oraya denk geldiğinde de okunur kalsın. */}
      <span
        className="absolute inset-x-0 bottom-0 block h-2/3"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 100%)",
        }}
      />
      <span
        className={`absolute left-5 bottom-4 font-semibold text-white/90 tracking-tight ${
          isHero ? "text-2xl md:text-3xl" : "text-lg"
        }`}
      >
        {plant ?? category}
      </span>
    </div>
  );
}
