/**
 * Kapak görseli sistemi — renk ve URL'in TEK kaynağı.
 *
 * NEDEN ÜRETİLEN GÖRSEL, NEDEN STOK FOTOĞRAF DEĞİL?
 * Günde bir makale yayımlanıyor. Her makale için elle görsel seçmek pipeline'ı
 * insana bağımlı kılar; stok fotoğraf servisine bağlanmak ise build'i ağa
 * bağımlı kılar (CI'da ağ hatası = o günün yazısı yok). Kapak build anında
 * kendi verimizden üretiliyor: sıfır bağımlılık, sıfır telif sorunu.
 *
 * NEDEN URL BİR VERİ ALANI DEĞİL?
 * Post tipinde `image` alanı YOK ve bilerek yok. Kapak yolu slug'dan
 * TÜRETİLİR — tıpkı Amazon linkinin bitki adından türetilmesi gibi. Üretilen
 * bir makale kendi görsel URL'ini uyduramaz, çünkü yazabileceği bir alan yok.
 * Rota da yalnızca gerçekten var olan yazılar için üretildiğinden (bkz.
 * app/kapak/[slug]/route.tsx, dynamicParams = false), kırık görsel bağlantısı
 * yapısal olarak imkânsız.
 *
 * NEDEN RENK KATEGORİDEN, RASTGELE DEĞİL?
 * İki sebep. (1) 14 kategori görsel olarak ayrışıyor; okuyucu listede renkten
 * konuyu tanıyor. (2) Determinizm: aynı yazı her build'de aynı kapağı alır.
 * Rastgele olsaydı her deploy og:image'ı değiştirir, paylaşılmış bağlantıların
 * sosyal ağ önbelleğini sürekli geçersiz kılardı.
 */
import { site } from "@/lib/brand-facts";

export type Palette = {
  /** Degradenin koyu ucu — beyaz metnin kontrast tabanı. */
  from: string;
  /** Degradenin açık ucu. */
  to: string;
  /** Dekoratif yaprak motifinin rengi (degradenin üstünde saydam kullanılır). */
  accent: string;
};

export const COVER_SIZE = { width: 1200, height: 630 } as const;

/**
 * Kategori → palet. Anahtarlar content/*.json'daki kategori adlarıyla BİREBİR
 * aynı olmak zorunda; eşleşmeyen kategori sessizce FALLBACK'e düşer.
 *
 * KONTRAST KURALI: kapaktaki tüm metin beyaz, dolayısıyla degradenin AÇIK
 * ucu da beyazı taşıyabilmeli. İlk denemede açık uçlar 400-500 seviyesindeydi
 * ve üretilen PNG'de amber üzerindeki alt satır ~2:1 kontrastla neredeyse
 * okunmuyordu. Açık uçlar bir kademe koyultuldu (600 seviyesi); ayrıca kartın
 * altına karartma katmanı konuldu (bkz. route.tsx). İkisi birlikte, en açık
 * palette bile alt bilgi çubuğunu okunur tutuyor.
 */
const PALETTES: Record<string, Palette> = {
  Bağışıklık: { from: "#064e3b", to: "#059669", accent: "#a7f3d0" },
  "Böbrek & İdrar Yolları": { from: "#164e63", to: "#0891b2", accent: "#a5f3fc" },
  "Eklem & İltihap": { from: "#7c2d12", to: "#d97706", accent: "#fde68a" },
  "Enerji & Dayanıklılık": { from: "#9a3412", to: "#ea580c", accent: "#fed7aa" },
  "Genel Bilgi": { from: "#292524", to: "#57534e", accent: "#e7e5e4" },
  "Göz Sağlığı": { from: "#312e81", to: "#4f46e5", accent: "#c7d2fe" },
  "Kadın Sağlığı": { from: "#831843", to: "#e11d48", accent: "#fecdd3" },
  "Kalp & Dolaşım": { from: "#7f1d1d", to: "#dc2626", accent: "#fecaca" },
  "Metabolizma & Kilo": { from: "#365314", to: "#65a30d", accent: "#d9f99d" },
  "Saç & Cilt": { from: "#701a75", to: "#c026d3", accent: "#f5d0fe" },
  "Sindirim & Karaciğer": { from: "#713f12", to: "#ca8a04", accent: "#fef08a" },
  Solunum: { from: "#0c4a6e", to: "#0284c7", accent: "#bae6fd" },
  "Uyku & Sakinlik": { from: "#3b0764", to: "#7c3aed", accent: "#ddd6fe" },
  "Zihin & Odaklanma": { from: "#1e3a8a", to: "#2563eb", accent: "#bfdbfe" },
};

const FALLBACK: Palette = { from: "#064e3b", to: "#059669", accent: "#a7f3d0" };

export function paletteFor(category: string): Palette {
  return PALETTES[category] ?? FALLBACK;
}

/**
 * FNV-1a 32-bit. Kriptografik değil, sadece dağılımı iyi ve DETERMİNİSTİK bir
 * hash gerekiyor: aynı slug her Node sürümünde, her makinede, her build'de
 * aynı sayıyı vermeli. Math.random() ya da tarih tabanlı bir seçim kapağı
 * build'den build'e değiştirir ve og:image önbelleklerini bozar.
 */
export function slugHash(slug: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Aynı kategorideki yazılar birbirinin kopyası görünmesin diye degrade açısı
 * ve motif yerleşimi slug'dan seçilir. Renk kategoriden (anlamlı), varyasyon
 * slug'dan (ayırt edici) — ikisi birlikte hem tutarlı hem tekrarsız.
 */
export function coverVariant(slug: string): {
  angle: number;
  motifTop: number;
  motifLeft: number;
  /**
   * Motifin dönüş açısı. Sadece süs değil: yaprak biçimi köşegen
   * border-radius'lu bir KAREDEN üretiliyor ve döndürülmediğinde kalan iki düz
   * kenar eksene paralel kalıyor — göz bunu yaprak değil "yuvarlatılmış kare"
   * olarak okuyor. İlk render'da açıkça görüldü. Döndürünce düz kenarlar
   * eğik oluyor ve biçim organikleşiyor.
   */
  motifRotate: number;
} {
  const h = slugHash(slug);
  const angles = [115, 135, 155, 200];
  return {
    angle: angles[h % angles.length],
    motifTop: [-110, -40, 150, 220][(h >>> 3) % 4],
    motifLeft: [700, 760, 820, 870][(h >>> 6) % 4],
    motifRotate: [-24, -12, 14, 28][(h >>> 9) % 4],
  };
}

/** Site köküne göre yol — sayfa içi <img> için. */
export function coverPath(slug: string): string {
  return `/kapak/${slug}.png`;
}

/** Mutlak URL — og:image ve JSON-LD image alanı mutlak URL ister. */
export function coverUrl(slug: string): string {
  return `${site.url}${coverPath(slug)}`;
}

/** Anasayfa ve rehber listesinin paylaşım kartı. */
export const SITE_COVER_SLUG = "site";
