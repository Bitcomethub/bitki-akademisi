/**
 * SEO/SERP karakter sınırları ve kırpma yardımcıları.
 *
 * ── NEDEN KARAKTER, KELİME DEĞİL ──
 * Google <title>'ı ~60, <meta description>'ı ~155 KARAKTERDE kırpar. Üretici
 * tarafındaki eşikler ise kelime bazlı (Türkçe sondan eklemeli olduğu için
 * kelimeyle kalibre edilmiş). İki birim karışınca borç birikir: 40 Türkçe
 * kelime ≈ 250-280 karakter eder ve SERP'te yarısı kesilir. Buradaki sabitler
 * Google'ın gördüğü tek şeyi — karakteri — ölçer.
 *
 * ── TEK KAYNAK DEĞİL, ÇİFT KAYNAK: DİKKAT ──
 * Aynı değerler `scripts/generate-blog-post.mjs` içindeki SEO bloğunda da
 * duruyor (o script TypeScript import edemez). Birini değiştirirken diğerini
 * de değiştir; ikisi birbirine bu yorumla bağlı.
 */

/** Marka eki, yalnızca başlık + ek ≤60'a sığdığında eklenir. */
export const TITLE_SUFFIX = " | Bitki Akademisi";
export const MAX_TITLE_LENGTH = 60;
export const MAX_DESCRIPTION_LENGTH = 155;

/** Kelime ortasını bölmeden `max` karaktere kırpar; sondaki noktalama temizlenir. */
export function trimToLength(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const body = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return body.replace(/[\s,;:.!?…-]+$/, "").trim();
}

/**
 * `<title>` metnini üretir; çıktı HER ZAMAN ≤60 karakter (marka eki dahil).
 *
 * Sıra:
 *   1) "Başlık | Bitki Akademisi" sığıyorsa onu ver (kısa başlıklarda marka görünür).
 *   2) Sığmıyor ve başlık bir soruysa ("…?") yalnız soru kısmını al — bu
 *      projede başlıklar zaten soru kalıbında olduğu için anlam bütünüyle korunur;
 *      "Zeytin Yaprağı Kimler Kullanmamalı? Yan Etkiler…" → "Zeytin Yaprağı
 *      Kimler Kullanmamalı? | Bitki Akademisi".
 *   3) Aksi halde kelime sınırında ≤60'a kırp (marka eki düşer).
 *
 * H1 bu işlevden GEÇMEZ: sayfa başlığı (h1) uzun kalabilir, kırpılan yalnız
 * arama motoruna giden <title>'dır.
 */
export function metaTitle(title: string): string {
  const withSuffix = `${title}${TITLE_SUFFIX}`;
  if (withSuffix.length <= MAX_TITLE_LENGTH) return withSuffix;

  const q = title.indexOf("?");
  if (q !== -1) {
    const head = title.slice(0, q + 1).trim();
    if (`${head}${TITLE_SUFFIX}`.length <= MAX_TITLE_LENGTH) {
      return `${head}${TITLE_SUFFIX}`;
    }
  }
  return trimToLength(title, MAX_TITLE_LENGTH);
}

/** `<meta description>` metnini üretir; çıktı HER ZAMAN ≤155 karakter. */
export function metaDescription(description: string): string {
  const t = description.trim();
  if (t.length <= MAX_DESCRIPTION_LENGTH) return t;
  const cut = t.slice(0, MAX_DESCRIPTION_LENGTH);
  // Tercihen cümle sonunda bitir; yarıyı geçen bir cümle sonu varsa onu kullan.
  const end = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? ")
  );
  if (end >= MAX_DESCRIPTION_LENGTH * 0.5) return cut.slice(0, end + 1).trim();
  return trimToLength(t, MAX_DESCRIPTION_LENGTH);
}
