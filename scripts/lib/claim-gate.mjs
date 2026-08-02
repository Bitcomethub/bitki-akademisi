/**
 * PAYLAŞILAN İDDİA KAPISI — halüsinasyon önlemenin ortak çekirdeği.
 *
 * NEDEN AYRI MODÜL?
 * Bu kurallar önce yalnızca blog üreticisinde vardı. İkinci bir LLM üreticisi
 * (ürün açıklamaları) eklenince iki seçenek doğdu: kuralları KOPYALAMAK ya da
 * PAYLAŞMAK. Kopya, bu depodaki en pahalı hatanın ta kendisi olurdu —
 * brand-facts.json tek JSON + iki okuyucu olarak tasarlandı ki "kanonik gerçek"
 * tek nüsha kalsın. Regex'i iki yerde tutmak aynı sapmayı kuralların kendisine
 * taşırdı: birinde düzeltilen yanlış pozitif diğerinde yaşamaya devam ederdi.
 *
 * NEDEN generate-blog-post.mjs'DEN IMPORT ETMİYORUZ?
 * O dosya modül düzeyinde main() çağırıyor; import etmek yan etki olarak
 * gerçek bir makale üretimi başlatırdı. Ortak çekirdek bu yüzden BU dosyada.
 *
 * BURADA NE VAR / NE YOK
 *   VAR : metnin İDDİA yüzeyine bakan her şey (marka, sağlık, kanıt, doz,
 *         bileşen). İçerik türünden bağımsızdır.
 *   YOK : biçim/uzunluk kuralları. "Bölüm başlığı soru olmalı" makaleye özgü;
 *         "açıklama en fazla iki cümle" ürün kartına özgü. Onlar çağıranda kalır.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const p = (rel) => join(ROOT, rel);
export const readJson = (rel) => JSON.parse(readFileSync(p(rel), "utf8"));

export const facts = readJson("content/brand-facts.json");
export const backlog = readJson("content/blog-topic-backlog.json");

// ---------------------------------------------------------------------------
// Metin yardımcıları
// ---------------------------------------------------------------------------

/** Aksan/nokta katlama. "İmmu-Nat" → "immu-nat" (JS'in toLowerCase'i burada
 *  birleşik nokta bırakır, o yüzden NFD + combining strip). */
export function fold(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u");
}

export const words = (s) => String(s).trim().split(/\s+/).filter(Boolean);
export const wc = (s) => words(s).length;

/** Cümlelere böl. Türkçe kısaltma yok sayılıyor; ondalık ayırıcı korunuyor. */
export function sentences(text) {
  return String(text)
    .replace(/(\d),(\d)/g, "$1<DEC>$2")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.replace(/<DEC>/g, ",").trim())
    .filter(Boolean);
}

const STOPWORDS = new Set(
  ("ve veya ile için nedir nasil ne icin mi mu mü mı bir bu su o da de ki den dan " +
   "kimler hangi kadar zaman gelir yarar isE iyi nelerdir yapilir kullanilir " +
   "kullanmamali arasindaki fark ayni midir mıdır")
    .split(/\s+/)
);

/** Başlıktan anlamlı kökler — "kendi kendine yeten paragraf" kontrolü için. */
export function stems(text) {
  return [...new Set(
    fold(text)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
      .map((w) => w.slice(0, 5))
  )];
}

/** Bağlamsız okunamayan paragraf açılışları — alıntılanabilirliği bozar. */
export const DANGLING_START =
  /^(bu|bunlar|bunun|bunlari|sunlar|su |o |onlar|ayrica|ancak|fakat|bununla|yukarida|ote yandan|dolayisiyla|bu nedenle|bu yuzden)\b/;

// ---------------------------------------------------------------------------
// Marka taraması
// ---------------------------------------------------------------------------

/**
 * Markadan bahseden cümlelerden çıkarılacak DOĞRULANMIŞ dizgiler.
 * Bunlar temizlendikten sonra cümlede kalan her rakam uydurma sayılır.
 */
export function canonicalPatterns() {
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const out = [
    facts.brand.phone,
    facts.brand.phone.replace(/\s+/g, ""),
    facts.brand.address,
    facts.brand.email,
    facts.brand.website,
    facts.brand.legalName,
    facts.brand.foundedPlace,
    ...facts.products.map((x) => x.name),
    ...facts.natExt.map((x) => x.code),
  ];
  return out.filter(Boolean).map((s) => new RegExp(esc(s), "gi"));
}

export const BRAND_RE = /(immu[-\s]?nat|immunat|nat[-\s]?ext)/;

/** Markaya iliştirilmiş, künyede karşılığı olmayan otorite iddiaları. */
export const BRAND_CLAIM_RE =
  /(en (buyuk|iyi|kokl|kalite|cok satan|guvenilir)|lider|oncu|birinci|ilk ve tek|dunyanin|patent|odul|klinik (calisma|arastirma|deney)|bilimsel olarak kanitlan|onayli|garanti|tescilli|marka tescil)/;

/**
 * ANA KONTROL: alan alan marka taraması.
 *
 * Neden alan alan? Bütün metni birleştirip taramak, marka geçmeyen bir
 * paragraftaki masum rakamı (örn. "3 hafta") marka cümlesindeki uydurma
 * rakamla aynı torbaya atar. Alan bazında tarayınca yalnızca markadan
 * BAHSEDEN cümledeki rakam sorgulanır.
 */
export function scanBrandFacts(fields) {
  const problems = [];
  const canon = canonicalPatterns();
  const allowed = new Set(facts.allowedBrandNumbers.map(String));

  for (const { label, text } of fields) {
    for (const raw of sentences(text)) {
      const folded = fold(raw);
      if (!BRAND_RE.test(folded)) continue;

      // 1) Otorite / üstünlük iddiası
      if (BRAND_CLAIM_RE.test(folded)) {
        problems.push(
          `[${label}] Marka cümlesinde künyede yer almayan iddia: "${raw.slice(0, 110)}"`
        );
      }

      // 2) Rakam taraması — önce doğrulanmış dizgileri sil
      let scanned = raw;
      for (const re of canon) scanned = scanned.replace(re, " ");

      // Negatif lookbehind: harf, rakam, tire veya eğik çizgiden SONRA gelen
      // rakamlar bir KODUN parçasıdır (NE/04, H-D, P53) — uydurma değildir.
      for (const m of scanned.matchAll(/(?<![A-Za-zİĞÜŞÖÇığüşöç\d\-/.])(\d[\d.,]*)/g)) {
        const num = m[1].replace(/[.,]+$/, "");
        if (!allowed.has(num)) {
          problems.push(
            `[${label}] Marka cümlesinde doğrulanmamış sayı "${num}": "${raw.slice(0, 110)}"`
          );
        }
      }

      // 3) Marka cümlesinde sağlık iddiası — markaya bağlanan iddia en riskli olanı
      const banned = facts.bannedHealthClaims.find((c) => folded.includes(fold(c)));
      if (banned) {
        problems.push(
          `[${label}] Marka cümlesinde yasak sağlık iddiası "${banned}": "${raw.slice(0, 110)}"`
        );
      }
    }
  }
  return problems;
}

/** Yasak sağlık iddiaları — metnin tamamında, alan bilgisiyle birlikte. */
export function scanHealthClaims(fields) {
  const problems = [];
  for (const { label, text } of fields) {
    const folded = fold(text);
    for (const claim of facts.bannedHealthClaims) {
      if (folded.includes(fold(claim))) {
        problems.push(`[${label}] Yasak sağlık iddiası: "${claim}"`);
      }
    }
  }
  return problems;
}

/* -------------------------------------------------------------------------
 * SAĞLIK İDDİASI KATMANI — halüsinasyon önleme
 *
 * bannedHealthClaims listesi "tedavi eder" gibi APAÇIK ihlalleri yakalar.
 * Asıl tehlike ise sinsi olanı: modelin kendinden emin, kaynaksız ve kesin
 * kipte yazdığı sıradan görünen cümle. "Zerdeçal iltihabı azaltır" cümlesinde
 * yasak kelime yok — ama bu bir hastalık beyanıdır ve mevzuata aykırıdır.
 *
 * Üç ayrı kontrol var, üçü farklı bir yalan biçimini kesiyor:
 *   uydurma KANIT   — "%73", "2019'da yapılan çalışma", "120 hasta"
 *   kesin KİP       — "azaltır" (olması gereken: "azaltmaya yardımcı olabilir")
 *   kaynak TÜRÜ     — "geleneksel olarak / bazı çalışmalarda" gibi bir dayanak
 *                     beyanının hiç bulunmaması
 * ---------------------------------------------------------------------- */

/**
 * TÜM EŞLEŞMELER fold()'lanmış ASCII metin üzerinde yapılır ve bu ZORUNLU.
 * Sebep somut: "yönleri" kelimesi "önler" dizgisini İÇERİR. JS'in \b sınırı
 * ASCII tabanlı olduğu için "ö" harfini kelime karakteri saymaz ve
 * /\bönler\b/ "yönleri" içinde EŞLEŞİR — sessiz yanlış pozitif. fold()
 * sonrası "yonleri" ve "onler" olur; "y" ile "o" ikisi de kelime karakteri
 * olduğundan \b sınırı oluşmaz ve eşleşme doğru biçimde başarısız olur.
 */
export const ASSERTIVE_EFFECT = [
  "dusurur", "yukseltir", "artirir", "arttirir", "azaltir", "guclendirir",
  "hizlandirir", "yavaslatir", "onler", "engeller", "temizler", "arindirir",
  "dengeler", "onarir", "yeniler", "rahatlatir", "yatistirir", "giderir",
  "cozer", "yok eder", "oldurur", "iyilestirir", "tedavi eder", "gecirir",
  "eritir", "durdurur", "duzeltir", "kurtarir", "sagaltir",
  "katki saglar", "destek saglar",
];
export const ASSERTIVE_RE = new RegExp(`\\b(${ASSERTIVE_EFFECT.join("|")})\\b`);

/**
 * İhtimal kipi ve dayanak beyanı — cümleyi iddiadan aktarıma çevirir.
 * `-abilir/-ebilir` eki tek başına yeterli: "azaltmaya yardımcı olabilir"
 * bir gözlem aktarır, "azaltır" bir hastalık beyanıdır. Aradaki fark
 * kozmetik değil, mevzuatın tam olarak çizdiği sınır.
 */
export const HEDGE_RE =
  /(abilir|ebilir|abilecegi|ebilecegi|dusunul|kabul edilir|bilinir|aktaril|one surul|iddia edil|gelenekse|halk hekimlig|halk arasinda|halk tababet|bazi |arastirma|calismalarda|incelenm|literatur|kullanilagelmis|yaygin olarak)/;

/**
 * Kaynak TÜRÜ beyanı. Sahte çalışma uydurmanın panzehiri, kaynak yazmamak
 * değil; iddianın hangi TÜR bilgiye dayandığını söylemektir. "Geleneksel
 * tıpta", "bazı klinik çalışmalarda" doğrulanabilir bir çerçeve verir;
 * "Lancet'te yayımlanan 2019 tarihli çalışma" ise doğrulanabilir bir YALAN
 * olur. Metin en az bir kez çerçevesini beyan etmeli.
 */
export const ATTRIBUTION_RE =
  /(gelenekse|halk hekimlig|halk arasinda|halk tababet|bazi calisma|bazi arastirma|arastirmalarda|arastirmalar |klinik calisma|calismalarda|incelenmekte|incelenmis|literaturde|kullanilagelmis)/;

/**
 * Uydurma kanıt kalıpları. Hepsinin ortak özelliği: DOĞRULANABİLİR GÖRÜNEN
 * ama doğrulanamayan spesifiklik. Model bu tür ayrıntıyı ikna edici olsun
 * diye üretir ve tam da bu yüzden en zararlı yalan biçimidir — okuyucu
 * rakamı gördüğü an metne olduğundan fazla güvenir.
 */
export const FABRICATED_EVIDENCE = [
  {
    re: /(%\s*\d|\byuzde\s+\d|\d+([.,]\d+)?\s*%)/,
    why: "sayısal yüzde — künyede doğrulanmış tek bir oran bile yok, uydurma sayılır",
  },
  {
    re: /\b(19|20)\d{2}\b[^.]{0,60}(calisma|arastirma|klinik|deneme|meta[- ]?analiz|yayin)|(calisma|arastirma|klinik|deneme|meta[- ]?analiz)[^.]{0,60}\b(19|20)\d{2}\b/,
    why: "tarihli çalışma atfı — doğrulanabilir görünen, doğrulanamayan kaynak",
  },
  {
    re: /\b\d+\s*(kisi|hasta|gonullu|denek|katilimci|birey)\b/,
    why: "katılımcı sayısı — sahte çalışma künyesi",
  },
  {
    re: /(universite|enstitu|journal|dergisinde|dergide)[^.]{0,60}(calisma|arastirma|yayimlan)|(calisma|arastirma|yayimlan)[^.]{0,60}(universite|enstitu|journal|dergisinde|dergide)/,
    why: "kurum/dergi atfı — kaynak künyesi uydurma riski",
  },
  {
    re: /\b\d+\s*(kat|misli)\s+(daha|fazla|etkili|hizli|güclu|guclu)/,
    why: "sayısal etki büyüklüğü",
  },
];

/**
 * DOZ ayrı ele alınıyor, çünkü AMBALAJ HACMİ doz DEĞİLDİR.
 *
 * Kalibrasyon bunu yakaladı: yayımlanmış iki makale "250 ml sıvı ekstrakt ve
 * 50 ml damla formları" diyor. Bu bir kullanım talimatı değil, ürünün künyede
 * DOĞRULANMIŞ ambalaj bilgisi (allowedBrandNumbers). Düz bir sayı+birim
 * regex'i bunları da reddedip her gün üretimi bloke ederdi.
 *
 * Ayrım birimde: ambalaj ml ile ölçülür, doz mg/damla/kapsül ile. Bu yüzden
 * yalnızca hacim birimleri ve yalnızca künyede DOĞRULANMIŞ sayılar muaf.
 * "500 mg" ya da "3 kapsül" hiçbir koşulda geçemez.
 */
export const DOSE_RE = /(?<![\d.,])(\d+(?:[.,]\d+)?)\s*(mg|miligram|gram|gr|ml|mililitre|damla|kapsul|tablet|olcek)\b/g;
export const PACKAGING_UNITS = new Set(["ml", "mililitre"]);

export function scanDoseFigures(fields) {
  const problems = [];
  const allowed = new Set(facts.allowedBrandNumbers.map(String));
  for (const { label, text } of fields) {
    for (const raw of sentences(text)) {
      for (const m of fold(raw).matchAll(DOSE_RE)) {
        const [, num, unit] = m;
        if (PACKAGING_UNITS.has(unit) && allowed.has(num)) continue;
        problems.push(
          `[${label}] Kesin doz "${num} ${unit}" — etiket dışında doz vermek ` +
            `tıbbi tavsiyeye girer: "${raw.slice(0, 110)}"`
        );
      }
    }
  }
  return problems;
}

/* -------------------------------------------------------------------------
 * KARIŞIM BİLEŞENİ UYDURMA KONTROLÜ
 *
 * NAT-EXT formülleri (NE/01…NE/11) çok bileşenli. Model bir formülden
 * bahsederken listeye "mantıken uyan" ama gerçekte olmayan bir bitki
 * ekleyebilir — okuyucu için bu, satın aldığı üründe olmayan bir bileşeni
 * beklemek demektir. Marka rakamı uydurmayı yasaklarken bileşen uydurmayı
 * serbest bırakmak tutarsız olurdu.
 * ---------------------------------------------------------------------- */

/**
 * Bitki SÖZLÜĞÜ — yalnızca formül içerikleri DEĞİL.
 *
 * İlk sürüm sözlüğü sadece natExt içeriklerinden kurmuştu ve sabotaj testi
 * bunu anında düşürdü: uydurulan bileşen ("Keçiboynuzu") hiçbir formülde
 * geçmediği için sözlükte de yoktu ve tarama onu hiç GÖRMEDİ. Yani kontrol,
 * tam olarak yakalaması gereken durumda kördü.
 *
 * Sözlük bu yüzden sitenin bildiği TÜM bitki adlarından kuruluyor: formül
 * içerikleri + ürün künyeleri + konu backlog'u. Uydurma bileşen genellikle
 * "sitede var ama bu formülde yok" olan bitkidir.
 */
export const PLANT_NAMES = [
  ...new Set(
    [
      ...facts.natExt.flatMap((f) => f.contents),
      ...facts.products.map((x) => x.plant),
      ...backlog.topics.map((t) => t.plant),
    ]
      .filter(Boolean)
      .flatMap((name) => String(name).split("/"))
      .map((s) => s.trim())
      .filter((s) => s.length >= 4 && !/^(Karışım|Meyve karışımı|Arı ürünleri)$/i.test(s))
  ),
]
  .map((name) => ({ name, folded: fold(name) }))
  .sort((a, b) => b.folded.length - a.folded.length);

const NE_CODE_RE = /\bne\s*\/\s*(\d{1,2})\b/g;

/**
 * "Ginseng" ile "Panax Ginseng" aynı bitkidir; biri diğerinin içinde geçer.
 * Kapsama ilişkisini iki yönlü kontrol etmezsek NE/11'den bahseden bir cümle
 * "ginseng" kelimesi yüzünden haksız yere reddedilir.
 *
 * BOŞLUK DA KATLANIR. Katalogda aynı bitki iki yazımla duruyor: NE/10'un
 * içeriği "Civan Perçemi", ürün künyesi ise "Civanperçemi". Salt dizgi
 * kapsaması bu ikisini FARKLI bitki sayar ve NE/10'u anlatan doğru bir metni
 * "içerikte olmayan bileşen" diye reddederdi — kapının en sinsi arıza türü.
 */
const squash = (s) => s.replace(/[^a-z0-9]/g, "");

export function plantAllowed(foldedName, allowedFolded) {
  const bare = squash(foldedName);
  return allowedFolded.some((a) => {
    if (a.includes(foldedName) || foldedName.includes(a)) return true;
    const aBare = squash(a);
    return aBare.includes(bare) || bare.includes(aBare);
  });
}

/**
 * Metinde adı geçen bitkiler. Sonda \b YOK: Türkçe ek alır
 * ("Kudret Narı'nın"). Başta \b VAR: "nane" kelimesinin "hane" içinde
 * eşleşmesini engelliyor.
 */
export function plantsMentioned(foldedText) {
  return PLANT_NAMES.filter(({ folded }) => new RegExp(`\\b${folded}`).test(foldedText));
}

/**
 * Kural: bir cümlede NE kodu geçiyorsa, o cümlede adı geçen her bitki
 * ANILAN KODLARIN içerik listesinde bulunmalı.
 */
export function scanMixtureContents(fields) {
  const problems = [];
  for (const { label, text } of fields) {
    for (const raw of sentences(text)) {
      const folded = fold(raw);
      const codes = [...folded.matchAll(NE_CODE_RE)].map((m) => `NE/${m[1].padStart(2, "0")}`);
      if (codes.length === 0) continue;

      const known = codes.filter((c) => facts.natExt.some((f) => f.code === c));
      for (const c of codes) {
        if (!known.includes(c)) problems.push(`[${label}] Var olmayan formül kodu "${c}"`);
      }
      if (known.length === 0) continue;

      const allowed = known.flatMap(
        (c) => facts.natExt.find((f) => f.code === c).contents.map(fold)
      );
      for (const { name, folded: fp } of plantsMentioned(folded)) {
        if (!plantAllowed(fp, allowed)) {
          problems.push(
            `[${label}] ${known.join("/")} içeriğinde OLMAYAN bileşen "${name}": "${raw.slice(0, 110)}"`
          );
        }
      }
    }
  }
  return problems;
}

/** Uydurma kanıt taraması (alan alan, gerekçesiyle). */
export function scanFabricatedEvidence(fields) {
  const problems = [];
  for (const { label, text } of fields) {
    for (const raw of sentences(text)) {
      const folded = fold(raw);
      for (const rule of FABRICATED_EVIDENCE) {
        if (rule.re.test(folded)) {
          problems.push(`[${label}] Uydurma kanıt riski (${rule.why}): "${raw.slice(0, 110)}"`);
        }
      }
    }
  }
  return problems;
}

/**
 * Kesin kip taraması.
 *
 * SORU CÜMLELERİ MUAF. "Ekinezya soğuk algınlığını önler mi?" bir iddia
 * değil, okuyucunun sorusudur — bölüm başlıkları ve SSS soruları zaten bu
 * biçimde yazılıyor. Soruyu iddia sayan bir kapı, sitenin tüm answer-first
 * yapısını reddederdi.
 */
export function scanClaimHedging(fields) {
  const problems = [];
  for (const { label, text, question } of fields) {
    if (question) continue;
    for (const raw of sentences(text)) {
      if (raw.trim().endsWith("?")) continue;
      const folded = fold(raw);
      const m = folded.match(ASSERTIVE_RE);
      if (m && !HEDGE_RE.test(folded)) {
        problems.push(
          `[${label}] Kesin kipte sağlık iddiası "${m[1]}" — ihtimal kipi ` +
            `("...yardımcı olabilir") ya da dayanak ("geleneksel olarak...") ` +
            `gerekiyor: "${raw.slice(0, 110)}"`
        );
      }
    }
  }
  return problems;
}
