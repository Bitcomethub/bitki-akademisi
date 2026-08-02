/**
 * Bitki adı → görsel tanım tablosu (kapak görseli üretimi için).
 *
 * NEDEN AYRI DOSYA VE NEDEN LATİNCE?
 * Görsel üreten modeller İngilizce/Latince botanik adlandırma üzerine eğitilmiş.
 * Prompt'a "Çörek Otu" yazmak modeli tahmine zorlar ve başka bir bitki çizer;
 * "Nigella sativa" yazmak doğru türe kilitler. Bu tablo o çeviriyi yapıyor.
 *
 * EN ÖNEMLİ KURAL: EMİN DEĞİLSEN null BIRAK.
 * Latince ad uydurmak, jenerik görselden çok daha kötü bir hata: okuyucu
 * "Kırkkilit Otu nedir?" başlığının altında bambaşka bir bitkinin fotoğrafını
 * görür ve bu sessizce yanlıştır — kimse fark etmez, ama içerik güvenilirliğini
 * temelden bozar. null olan bitkiler jenerik botanik kompozisyona düşer:
 * doğru olmayan bir şey göstermektense, spesifik olmayan bir şey göstermek.
 *
 * `subject` alanı Latince adın yanına NE GÖRÜNECEĞİNİ yazar (yaprak mı, kök mü,
 * meyve mi). Ürün hangi kısımdan yapılıyorsa görsel de onu göstermeli —
 * "Zeytin Yaprağı Ekstraktı"nın kapağında zeytin meyvesi olması yanlış olurdu.
 */

/** @type {Record<string, {latin: string, subject: string} | null>} */
export const PLANT_VISUALS = {
  Alıç: { latin: "Crataegus monogyna", subject: "clusters of small red hawthorn berries on a branch with lobed leaves" },
  "Aynı Safa": { latin: "Calendula officinalis", subject: "orange pot marigold flowers with petals and green stems" },
  Biberiye: { latin: "Rosmarinus officinalis", subject: "fresh rosemary sprigs with narrow needle-like leaves" },
  Civanperçemi: { latin: "Achillea millefolium", subject: "white yarrow flower heads with feathery foliage" },
  "Civan Perçemi": { latin: "Achillea millefolium", subject: "white yarrow flower heads with feathery foliage" },
  "Çörek Otu": { latin: "Nigella sativa", subject: "small matte black cumin seeds in a shallow wooden bowl beside a dried seed pod" },
  "Damar Otu": { latin: "Plantago lanceolata", subject: "ribwort plantain leaves with parallel veins and slender flower spikes" },
  "Deve Dikeni": { latin: "Silybum marianum", subject: "milk thistle flower head with purple bristles and white-marbled leaves" },
  Ekinezya: { latin: "Echinacea purpurea", subject: "purple coneflowers with drooping petals and prominent spiky centres" },
  "Enginar Yaprağı": { latin: "Cynara scolymus", subject: "large silvery-green artichoke leaves" },
  Gilaburu: { latin: "Viburnum opulus", subject: "translucent red guelder rose berries in clusters" },
  "Ginkgo Biloba": { latin: "Ginkgo biloba", subject: "fan-shaped ginkgo leaves" },
  Ginseng: { latin: "Panax ginseng", subject: "a forked ginseng root with fine rootlets on a dark surface" },
  "Panax Ginseng": { latin: "Panax ginseng", subject: "a forked ginseng root with fine rootlets on a dark surface" },
  "Hayıt Meyvesi": { latin: "Vitex agnus-castus", subject: "small dark chaste tree berries and palmate leaves" },
  "Hayıt Tohumu": { latin: "Vitex agnus-castus", subject: "small dried chaste tree seeds in a shallow bowl" },
  "Hindiba Yaprağı": { latin: "Cichorium intybus", subject: "pale blue chicory flowers with toothed leaves" },
  Hindiba: { latin: "Cichorium intybus", subject: "pale blue chicory flowers with toothed leaves" },
  Isırgan: { latin: "Urtica dioica", subject: "fresh stinging nettle leaves with serrated edges" },
  "Karabaş Otu": { latin: "Lavandula stoechas", subject: "French lavender flower heads with distinctive upright purple bracts" },
  Keçiboynuzu: { latin: "Ceratonia siliqua", subject: "dark brown carob pods, some broken open" },
  "Kudret Narı": { latin: "Momordica charantia", subject: "warty green bitter melon fruit, one sliced open showing red seeds" },
  "Meyan Kökü": { latin: "Glycyrrhiza glabra", subject: "dried licorice root sticks, fibrous and pale yellow inside" },
  Nane: { latin: "Mentha piperita", subject: "fresh peppermint leaves" },
  "Reishi Mantarı": { latin: "Ganoderma lucidum", subject: "a glossy kidney-shaped reishi mushroom with concentric reddish-brown bands" },
  "Sarı Kantaron": { latin: "Hypericum perforatum", subject: "bright yellow St John's wort flowers with many stamens" },
  Sinameki: { latin: "Senna alexandrina", subject: "dried senna leaflets and flat pods" },
  "Siyah Üzüm Çekirdeği": { latin: "Vitis vinifera", subject: "dark purple grapes, one cut open, beside a small pile of grape seeds" },
  "Yaban Mersini": { latin: "Vaccinium myrtillus", subject: "deep blue bilberries on a low shrub with small oval leaves" },
  Zencefil: { latin: "Zingiber officinale", subject: "a knobbly fresh ginger rhizome, partly sliced" },
  Zerdeçal: { latin: "Curcuma longa", subject: "fresh turmeric rhizomes with deep orange cut faces beside ground turmeric powder" },
  "Zeytin Yaprağı": { latin: "Olea europaea", subject: "silver-green olive branch leaves, no fruit" },
  "Çoban Çökerten": { latin: "Ononis spinosa", subject: "spiny restharrow with small pink pea-like flowers" },

  // ——— EMİN OLMADIKLARIM ———
  // Bu adlar Türkçe bitki ticaretinde birden fazla türe karşılık gelebiliyor.
  // Tek bir Latince ad yazmak, yanlış türü kesinmiş gibi göstermek olurdu.
  // Jenerik botanik kompozisyona düşüyorlar; doğru Latince adlar teyit
  // edildiğinde buraya eklenip görseller yeniden üretilebilir.
  "Kırkkilit Otu": null,
  Kırkkilit: null,
  "Yavşan Otu": null,
  "Acı Çehre": null,
  "Yakı Otu": null,
  // Tek bitki değil, şurup formülü.
  "Osmanlı Kök": null,
  "Meyve karışımı": null,
  Karışım: null,
};

/** Latince adı bilinmeyen ya da çok bitkili konular için nötr kompozisyon. */
export const GENERIC_SUBJECT =
  "an assortment of dried medicinal herbs and botanical leaves arranged loosely on a weathered wooden surface";

export function visualFor(plant) {
  if (!plant) return null;
  return PLANT_VISUALS[plant] ?? null;
}

/** Tabloda hiç anahtarı olmayan bitki = gözden kaçmış demektir; testte yakalanır. */
export function isKnownPlant(plant) {
  return Object.prototype.hasOwnProperty.call(PLANT_VISUALS, plant);
}
