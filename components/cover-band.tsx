/**
 * Sayfa içi kapak — fal.ai fotoğrafı varsa o, yoksa degrade şerit.
 *
 * ÜÇ FARKLI GÖRSEL VAR VE ÜÇÜ FARKLI İŞ YAPIYOR. Karıştırılmaması önemli:
 *
 * 1. public/images/blog/<slug>.jpg — fal.ai ile üretilen BOTANİK FOTOĞRAF.
 *    Sayfa içinde kullanılır (bu bileşen). Üzerinde metin yoktur; işi bitkiyi
 *    göstermek, okuyucuya konuyu bir bakışta tanıtmak.
 * 2. /kapak/<slug>.png — üzerinde SORU yazan paylaşım kartı. Yalnızca
 *    og:image, twitter:image ve Article.image'ta. Kartı gören kişi sayfayı
 *    henüz açmamıştır; orada metin şart, fotoğraf tek başına bilgi vermez.
 * 3. Degrade şerit — fotoğrafı olmayan yazılar için yedek. Görsel üretimi
 *    başarısız olduğunda sayfa görselsiz ya da kırık kalmaz.
 *
 * Fotoğraf sayfada, metinli kart sosyalde: her biri izleyicisinin neyi zaten
 * bildiğine göre seçildi.
 *
 * Degrade rengi Tailwind sınıfıyla verilemez: renkler çalışma zamanında
 * kategoriden geliyor, Tailwind ise sınıf adlarını kaynak kodda statik olarak
 * tarar — `bg-[${palette.from}]` derlenmez, sessizce kaybolur. Dinamik renk
 * için doğru kaçış yolu inline style.
 */
import Image from "next/image";
import { coverVariant, paletteFor } from "@/lib/cover";
import { photoPath } from "@/lib/photo";

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
  const photo = photoPath(slug);

  // Fotoğraf VARSA o gösterilir; yoksa degrade şeride düşülür. Şerit ölmedi,
  // yedek oldu: görsel üretimi başarısız olan ya da henüz üretilmemiş bir yazı
  // görselsiz/bozuk değil, sadece daha sade görünür. Sayfa her koşulda çalışır.
  if (photo) {
    return (
      <div
        className={`relative overflow-hidden bg-stone-100 ${
          isHero ? "h-56 md:h-80 rounded-2xl" : "h-40"
        }`}
      >
        <Image
          src={photo}
          alt={`${plant ?? category} — bitkinin doğal görünümü`}
          fill
          // Kart ızgarası 3 sütun (md) → viewport'un ~1/3'ü; hero tam genişlik.
          // Doğru sizes vermek Next'in gereğinden büyük dosya servis etmesini
          // engelliyor, mobilde ciddi bant genişliği farkı yaratıyor.
          sizes={isHero ? "(min-width: 768px) 768px, 100vw" : "(min-width: 768px) 320px, 100vw"}
          className="object-cover"
          // Hero makale sayfasının ilk ekranında; LCP adayı olduğu için
          // tembel yüklenmemeli.
          priority={isHero}
        />
      </div>
    );
  }

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
