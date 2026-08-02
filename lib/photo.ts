/**
 * Bir yazının gerçek kapak FOTOĞRAFI var mı?
 *
 * NEDEN JSON ALANI DEĞİL DE DİSK KONTROLÜ?
 * Post tipine `image: "/images/blog/x.jpg"` diye bir alan koymak en bariz
 * çözümdü ve reddedildi: o alanı günlük pipeline'daki LLM dolduracaktı ve
 * model, dosya üretilmemiş olsa bile yolu yazabilirdi — sonuç sayfada kırık
 * görsel. Alan var olduğu sürece yanlış doldurulabilir.
 *
 * Dosya varlığı taklit edilemez. Model metin üretir, dosya oluşturamaz. Yani
 * "fotoğraf var mı?" sorusunun tek dürüst cevabı diske bakmaktır. Bu, projedeki
 * amazonUrl'in bitki adından, kapak PNG'sinin slug'dan türetilmesiyle aynı
 * ilke: uydurulabilecek bir alan hiç yaratma.
 *
 * ÇALIŞMA ZAMANI MALİYETİ YOK: tüm sayfalar statik üretiliyor (SSG), bu yüzden
 * existsSync yalnızca build sırasında, yazı başına bir kez çalışır. Üretilen
 * HTML'de sonuç sabittir.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Görsel üretildiğinde scripts/generate-cover-image.mjs buraya yazıyor. */
const PUBLIC_DIR = "public/images/blog";

export function photoPath(slug: string): string | null {
  const onDisk = join(process.cwd(), PUBLIC_DIR, `${slug}.jpg`);
  return existsSync(onDisk) ? `/images/blog/${slug}.jpg` : null;
}

/**
 * Üretilen görsellerin gerçek oranı (16:9'a çok yakın). next/image'a doğru
 * oranı vermek layout kaymasını (CLS) önlüyor.
 */
export const PHOTO_SIZE = { width: 1440, height: 800 } as const;
