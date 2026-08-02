#!/usr/bin/env node
/**
 * Günlük GEO makale üreticisi.
 *
 * AKIŞ
 *   backlog'dan sıradaki konu → Anthropic API → KALİTE KAPISI → yayın
 *   Kapıdan geçemezse: bir kez geri bildirimle yeniden dene, yine geçemezse
 *   taslağı content/rejected-drafts/ altına yaz, konuyu ertele, çıkış kodu 1.
 *
 * TASARIM KARARI — MODEL NEYİ *ÜRETEMEZ*
 * slug, title, question, plant, category, keywords alanları backlog'dan gelir;
 * model bunlara DOKUNAMAZ. Amazon linki de üretilmez — lib/posts.ts onu
 * `plant` alanından brand-facts.json üzerinden TÜRETİR. Yani model uydurma bir
 * ürün adı ya da uydurma bir link yazamaz; yazabileceği tek şey metin.
 * Uydurma yüzeyini daraltmak, uydurmayı sonradan yakalamaktan güvenlidir.
 *
 * KALİTE KAPISI HAKKINDA
 * Marka taraması ALAN ALAN yapılır, birleştirilmiş metin üzerinde değil.
 * Rakam taramasındaki (?<![A-Za-zİĞÜŞÖÇığüşöç\d\-\/]) negatif lookbehind
 * bilinçlidir: "NE/04", "XP Tonis H-D", "Curcumin P53" gibi kodların içindeki
 * rakamlar uydurma sanılmasın diye. (Bu, kardeş projede yaşanan ve bütün
 * üretimi bloke eden bir hatanın kalıcı düzeltmesidir.)
 *
 * Kullanım:
 *   node scripts/generate-blog-post.mjs            # üret + yayımla
 *   node scripts/generate-blog-post.mjs --dry-run  # üret, yayımlama
 *   node scripts/generate-blog-post.mjs --self-test # API'siz sabotaj testleri
 *   node scripts/generate-blog-post.mjs --next     # sıradaki konuyu yazdır
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (rel) => join(ROOT, rel);
const readJson = (rel) => JSON.parse(readFileSync(p(rel), "utf8"));

/**
 * MODEL SEÇİMİ — bilinçli ve geri alınabilir.
 * Varsayılan Sonnet 5: org'un aylık harcama tavanı paylaşımlı ve düşük; günde
 * bir Opus makalesi tavanı erken doldurup pipeline'ı sessizce durdurabilir.
 * Kaliteyi model tercihi değil KALİTE KAPISI + yeniden deneme korur.
 * Bütçe uygunsa tek değişkenle yükseltilir:  BLOG_MODEL=claude-opus-5
 */
const MODEL = process.env.BLOG_MODEL || "claude-sonnet-5";

const facts = readJson("content/brand-facts.json");
const backlog = readJson("content/blog-topic-backlog.json");

// ---------------------------------------------------------------------------
// Metin yardımcıları
// ---------------------------------------------------------------------------

/** Aksan/nokta katlama. "İmmu-Nat" → "immu-nat" (JS'in toLowerCase'i burada
 *  birleşik nokta bırakır, o yüzden NFD + combining strip). */
function fold(s) {
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

const words = (s) => String(s).trim().split(/\s+/).filter(Boolean);
const wc = (s) => words(s).length;

/** Cümlelere böl. Türkçe kısaltma yok sayılıyor; ondalık ayırıcı korunuyor. */
function sentences(text) {
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
function stems(text) {
  return [...new Set(
    fold(text)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
      .map((w) => w.slice(0, 5))
  )];
}

// ---------------------------------------------------------------------------
// Konu seçimi
// ---------------------------------------------------------------------------

const STATE_PATH = "content/blog-pipeline-state.json";

function loadState() {
  if (!existsSync(p(STATE_PATH))) return { deferred: {} };
  return readJson(STATE_PATH);
}

/**
 * "Yayımlandı" bilgisi backlog'da TUTULMAZ, yayımlanan slug'lardan TÜRETİLİR.
 * Böylece backlog dosyası hiç değişmez ve günlük commit'lerde çakışmaz.
 */
function publishedSlugs() {
  return new Set([
    ...readJson("content/seed-posts.json").posts.map((x) => x.slug),
    ...readJson("content/generated-posts.json").posts.map((x) => x.slug),
  ]);
}

function pickTopic() {
  const done = publishedSlugs();
  const state = loadState();
  return (
    backlog.topics.find(
      (t) => !done.has(t.slug) && (state.deferred[t.slug]?.attempts ?? 0) < 2
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// KALİTE KAPISI
// ---------------------------------------------------------------------------

/**
 * Markadan bahseden cümlelerden çıkarılacak DOĞRULANMIŞ dizgiler.
 * Bunlar temizlendikten sonra cümlede kalan her rakam uydurma sayılır.
 */
function canonicalPatterns() {
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

const BRAND_RE = /(immu[-\s]?nat|immunat|nat[-\s]?ext)/;

/** Markaya iliştirilmiş, künyede karşılığı olmayan otorite iddiaları. */
const BRAND_CLAIM_RE =
  /(en (buyuk|iyi|kokl|kalite|cok satan|guvenilir)|lider|oncu|birinci|ilk ve tek|dunyanin|patent|odul|klinik (calisma|arastirma|deney)|bilimsel olarak kanitlan|onayli|garanti|tescilli|marka tescil)/;

/**
 * ANA KONTROL: alan alan marka taraması.
 *
 * Neden alan alan? Bütün metni birleştirip taramak, marka geçmeyen bir
 * paragraftaki masum rakamı (örn. "3 hafta") marka cümlesindeki uydurma
 * rakamla aynı torbaya atar. Alan bazında tarayınca yalnızca markadan
 * BAHSEDEN cümledeki rakam sorgulanır.
 */
function scanBrandFacts(fields) {
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
function scanHealthClaims(fields) {
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

/**
 * Türkçe kelime eşikleri.
 * Türkçe sondan eklemeli: aynı bilgi İngilizceden ~%30-40 daha az kelimeyle
 * ifade edilir. Eşikler yayımlanmış üç makalenin ölçülen değerlerinden
 * kalibre edildi (bölüm 77-107 kelime, SSS 35-45, toplam 760-826).
 * İngilizce projeden sayı kopyalamak her makaleyi haksız yere "kısa" saydırırdı.
 */
const LIMITS = {
  keyTakeaway: [25, 70],
  keyTakeawayFirstSentence: 34,
  excerpt: [12, 40],
  introTotal: [50, 130],
  introFirstSentence: 34,
  sectionBody: [55, 160],
  faqAnswer: [18, 65],
  totalWords: [600, 1500],
  sections: [4, 6],
  faqs: [4, 6],
};

/** Bağlamsız okunamayan paragraf açılışları — alıntılanabilirliği bozar. */
const DANGLING_START =
  /^(bu|bunlar|bunun|bunlari|sunlar|su |o |onlar|ayrica|ancak|fakat|bununla|yukarida|ote yandan|dolayisiyla|bu nedenle|bu yuzden)\b/;

function range(n, [lo, hi]) {
  return n >= lo && n <= hi;
}

/**
 * Tüm kapı. `problems` boşsa makale yayına uygundur.
 * Her kural açık bir GEO/uyum gerekçesine dayanır; keyfi biçim kuralı yoktur.
 */
export function validatePost(post, topic) {
  const problems = [];
  const fail = (m) => problems.push(m);

  // --- R1: yapı ---------------------------------------------------------
  for (const key of ["keyTakeaway", "excerpt", "intro", "sections", "faqs"]) {
    if (post[key] == null) fail(`Eksik alan: ${key}`);
  }
  if (problems.length) return problems;
  if (!Array.isArray(post.intro) || !Array.isArray(post.sections) || !Array.isArray(post.faqs)) {
    fail("intro / sections / faqs dizi olmalı");
    return problems;
  }

  // --- R2: konu sabitliği ----------------------------------------------
  // Model konuyu değiştiremez; bu alanlar backlog'dan gelir. Yine de üretilen
  // metnin konudan sapmadığını kontrol ediyoruz.
  const bodyText = [
    post.keyTakeaway,
    ...post.intro,
    ...post.sections.flatMap((s) => [s.heading, ...(s.body || []), ...(s.list || [])]),
    ...post.faqs.flatMap((f) => [f.q, f.a]),
  ].join(" ");
  const subject = topic.plant || topic.title;
  const subjectStems = stems(subject);
  const foldedBody = fold(bodyText);
  if (subjectStems.length && !subjectStems.some((st) => foldedBody.includes(st))) {
    fail(`Metin konudan sapmış: "${subject}" hiç geçmiyor`);
  }

  // --- R3: answer-first (GEO'nun tek en önemli kuralı) ------------------
  const ktSentences = sentences(post.keyTakeaway);
  if (!range(wc(post.keyTakeaway), LIMITS.keyTakeaway)) {
    fail(`keyTakeaway ${wc(post.keyTakeaway)} kelime; ${LIMITS.keyTakeaway.join("-")} olmalı`);
  }
  if (ktSentences.length && wc(ktSentences[0]) > LIMITS.keyTakeawayFirstSentence) {
    fail(
      `keyTakeaway ilk cümlesi ${wc(ktSentences[0])} kelime; ` +
        `${LIMITS.keyTakeawayFirstSentence} kelimeyi aşmamalı (alıntılanabilir olmalı)`
    );
  }
  if (ktSentences.length && DANGLING_START.test(fold(ktSentences[0]))) {
    fail("keyTakeaway belirsiz bir zamirle başlıyor; bağlamsız okunamaz");
  }
  // Cevap, sorunun öznesini İÇERMELİ — "Evet, çok faydalıdır." alıntılanamaz.
  if (subjectStems.length && !subjectStems.some((st) => fold(post.keyTakeaway).includes(st))) {
    fail(`keyTakeaway konunun adını içermiyor ("${subject}"); tek başına alıntılanamaz`);
  }

  // --- R4: giriş --------------------------------------------------------
  if (post.intro.length < 2 || post.intro.length > 3) {
    fail(`intro ${post.intro.length} paragraf; 2-3 olmalı`);
  }
  const introWords = post.intro.reduce((n, x) => n + wc(x), 0);
  if (!range(introWords, LIMITS.introTotal)) {
    fail(`intro toplam ${introWords} kelime; ${LIMITS.introTotal.join("-")} olmalı`);
  }
  const firstIntro = sentences(post.intro[0] || "")[0] || "";
  if (wc(firstIntro) > LIMITS.introFirstSentence) {
    fail(`intro ilk cümlesi ${wc(firstIntro)} kelime; ${LIMITS.introFirstSentence} olmalı`);
  }
  if (DANGLING_START.test(fold(post.intro[0] || ""))) {
    fail("intro belirsiz bir zamirle başlıyor");
  }

  // --- R5: bölümler -----------------------------------------------------
  if (!range(post.sections.length, LIMITS.sections)) {
    fail(`${post.sections.length} bölüm; ${LIMITS.sections.join("-")} olmalı`);
  }
  const headingSeen = new Set();
  for (const [i, s] of post.sections.entries()) {
    const tag = `bölüm ${i + 1}`;
    if (!s.heading || !Array.isArray(s.body) || s.body.length === 0) {
      fail(`${tag}: heading/body eksik`);
      continue;
    }
    // Soru formatındaki H2, AI motorlarının doğrudan eşleştirdiği kalıptır.
    if (!s.heading.trim().endsWith("?")) {
      fail(`${tag}: başlık soru formatında değil → "${s.heading}"`);
    }
    const hKey = fold(s.heading).replace(/[^a-z0-9]/g, "");
    if (headingSeen.has(hKey)) fail(`${tag}: yinelenen başlık → "${s.heading}"`);
    headingSeen.add(hKey);

    const bodyWords = s.body.reduce((n, x) => n + wc(x), 0);
    if (!range(bodyWords, LIMITS.sectionBody)) {
      fail(`${tag}: gövde ${bodyWords} kelime; ${LIMITS.sectionBody.join("-")} olmalı → "${s.heading}"`);
    }
    // Kendi kendine yeten paragraf: motor bölümü tek başına alıntılayabilmeli.
    if (DANGLING_START.test(fold(s.body[0]))) {
      fail(`${tag}: ilk paragraf belirsiz zamirle başlıyor, bağlamsız alıntılanamaz`);
    }
    const hs = stems(s.heading);
    if (hs.length && !hs.some((st) => fold(s.body[0]).includes(st))) {
      fail(`${tag}: ilk paragraf başlığın konusunu tekrar etmiyor → "${s.heading}"`);
    }
  }

  // --- R6: SSS ----------------------------------------------------------
  if (!range(post.faqs.length, LIMITS.faqs)) {
    fail(`${post.faqs.length} SSS; en az ${LIMITS.faqs[0]} olmalı`);
  }
  const qSeen = new Set();
  for (const [i, f] of post.faqs.entries()) {
    const tag = `SSS ${i + 1}`;
    if (!f.q?.trim().endsWith("?")) fail(`${tag}: soru "?" ile bitmiyor → "${f.q}"`);
    const qKey = fold(f.q || "").replace(/[^a-z0-9]/g, "");
    if (qSeen.has(qKey)) fail(`${tag}: yinelenen soru`);
    if (headingSeen.has(qKey)) fail(`${tag}: bölüm başlığıyla birebir aynı → "${f.q}"`);
    qSeen.add(qKey);
    if (!range(wc(f.a || ""), LIMITS.faqAnswer)) {
      fail(`${tag}: cevap ${wc(f.a || "")} kelime; ${LIMITS.faqAnswer.join("-")} olmalı`);
    }
    // FAQPage şeması bu metni birebir yayımlar; cevap kendi başına durmalı.
    if (DANGLING_START.test(fold(f.a || ""))) {
      fail(`${tag}: cevap belirsiz zamirle başlıyor; şemada bağlamsız görünür`);
    }
  }

  // --- R7 + R8: marka ve sağlık iddiaları (ALAN ALAN) -------------------
  const fields = [
    { label: "excerpt", text: post.excerpt },
    { label: "keyTakeaway", text: post.keyTakeaway },
    ...post.intro.map((t, i) => ({ label: `intro[${i}]`, text: t })),
    ...post.sections.flatMap((s, i) => [
      { label: `sections[${i}].heading`, text: s.heading },
      ...(s.body || []).map((t, j) => ({ label: `sections[${i}].body[${j}]`, text: t })),
      ...(s.list || []).map((t, j) => ({ label: `sections[${i}].list[${j}]`, text: t })),
    ]),
    ...post.faqs.flatMap((f, i) => [
      { label: `faqs[${i}].q`, text: f.q },
      { label: `faqs[${i}].a`, text: f.a },
    ]),
  ];
  problems.push(...scanBrandFacts(fields));
  problems.push(...scanHealthClaims(fields));

  // --- R9: özet ve uzunluk ---------------------------------------------
  if (!range(wc(post.excerpt), LIMITS.excerpt)) {
    fail(`excerpt ${wc(post.excerpt)} kelime; ${LIMITS.excerpt.join("-")} olmalı`);
  }
  const total = introWords + wc(post.keyTakeaway) +
    post.sections.reduce((n, s) => n + s.body.reduce((m, x) => m + wc(x), 0) +
      (s.list || []).reduce((m, x) => m + wc(x), 0), 0) +
    post.faqs.reduce((n, f) => n + wc(f.a), 0);
  if (!range(total, LIMITS.totalWords)) {
    fail(`toplam ${total} kelime; ${LIMITS.totalWords.join("-")} olmalı`);
  }

  // --- R10: güvenlik yazısında hekim yönlendirmesi ----------------------
  // "kimler kullanmamalı" yazısı hekime yönlendirmeden yayımlanamaz.
  if (topic.archetype === "guvenlik" && !/hekim|doktor/.test(fold(bodyText))) {
    fail("Güvenlik yazısı hekim/doktor yönlendirmesi içermiyor");
  }

  return problems;
}

// ---------------------------------------------------------------------------
// Üretim
// ---------------------------------------------------------------------------

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    keyTakeaway: { type: "string" },
    excerpt: { type: "string" },
    intro: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
    sections: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          body: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
          list: { type: "array", items: { type: "string" } },
        },
        required: ["heading", "body"],
        additionalProperties: false,
      },
    },
    faqs: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        properties: { q: { type: "string" }, a: { type: "string" } },
        required: ["q", "a"],
        additionalProperties: false,
      },
    },
  },
  required: ["keyTakeaway", "excerpt", "intro", "sections", "faqs"],
  additionalProperties: false,
};

function systemPrompt() {
  return `Sen Bitki Akademisi'nin (${facts.site.url}) editörüsün. Türkçe, kaynak temelli bitkisel içerik yazıyorsun.

## Yazının amacı
Bir kullanıcı ya da bir yapay zekâ motoru (ChatGPT, Perplexity, Gemini) soruyu sorduğunda, senin yazdığın paragraf DOĞRUDAN ALINTILANABİLİR olmalı. Bu, her paragrafın bağlam olmadan tek başına okunduğunda anlaşılır olması demektir.

## Mutlak kurallar
1. CEVAP ÖNCE. keyTakeaway alanı sorunun doğrudan cevabıdır. İlk cümle 34 kelimeyi aşmaz, konunun adını içerir ve "Bu", "Bunlar", "Ayrıca" gibi bağlaç/zamirle BAŞLAMAZ.
2. Her bölüm başlığı SORU formatındadır ve "?" ile biter.
3. Her bölümün ilk paragrafı başlığın konusunu adıyla tekrar eder. Motor o paragrafı tek başına alıntılayabilmeli.
4. HASTALIK İDDİASI YASAK. "tedavi eder", "iyileştirir", "önler", "şifa" gibi ifadeler kullanılamaz — Türk Gıda Kodeksi Beslenme ve Sağlık Beyanları Yönetmeliği bunu yasaklar. Bunun yerine "geleneksel olarak kullanılır", "araştırmalarda incelenmiştir", "destek amaçlı tercih edilir" gibi ifadeler kullan.
5. İmmu-Nat markası hakkında AŞAĞIDAKİ KÜNYE DIŞINDA HİÇBİR ŞEY YAZMA. Künyede olmayan bir rakam, tarih, iddia, üstünlük ya da sertifika UYDURMA. Markadan bahsetmek zorunda değilsin — en güvenlisi hiç bahsetmemektir; yazının sonundaki ürün bağlantısı sistem tarafından otomatik eklenir.
6. Kesin doz verme. "Ürün etiketindeki miktar esastır" çerçevesini koru.

## İmmu-Nat künyesi (DOĞRULANMIŞ TÜM BİLGİ)
- Ticari ad: ${facts.brand.displayName}
- Tüzel unvan: ${facts.brand.legalName}
- Kuruluş: ${facts.brand.founded}, ${facts.brand.foundedPlace}
- Adres: ${facts.brand.address}
- Telefon: ${facts.brand.phone} · E-posta: ${facts.brand.email}
- Resmî site: ${facts.brand.website}
- Kalite sistemleri: ${facts.brand.qualitySystems.join(", ")}
- Alt marka: ${facts.brand.subBrands.join(", ")}
Bu listede olmayan hiçbir şey markaya atfedilemez.

## Uzunluk (Türkçe için kalibre edildi)
- keyTakeaway: ${LIMITS.keyTakeaway.join("-")} kelime
- excerpt: ${LIMITS.excerpt.join("-")} kelime, meraklandıran tek cümle
- intro: 2-3 paragraf, toplam ${LIMITS.introTotal.join("-")} kelime
- her bölüm gövdesi: ${LIMITS.sectionBody.join("-")} kelime
- her SSS cevabı: ${LIMITS.faqAnswer.join("-")} kelime
- toplam: ${LIMITS.totalWords.join("-")} kelime`;
}

function userPrompt(topic) {
  const kws = topic.keywords.join(", ");
  return `Aşağıdaki konuda bir rehber yaz.

BAŞLIK (değiştirme): ${topic.title}
CEVAPLANACAK SORU: ${topic.question}
KATEGORİ: ${topic.category}
${topic.plant ? `BİTKİ: ${topic.plant}` : "Bu yazı tek bir bitkiye değil, genel bir konuya odaklanır."}
HEDEF ANAHTAR KELİMELER: ${kws}

BU YAZININ SINIRI (çok önemli — kanibalizasyonu önler):
${topic.angle}

${LIMITS.sections[0]}-${LIMITS.sections[1]} bölüm ve ${LIMITS.faqs[0]}-${LIMITS.faqs[1]} SSS üret. SSS soruları bölüm başlıklarını TEKRARLAMASIN; okuyucunun aklında kalan artık soruları cevaplasın.`;
}

async function callModel(messages) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY tanımlı değil");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt(),
      messages,
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  const data = await res.json();
  const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text);
}

/** Bir kez yeniden dene: ilk denemenin hataları geri bildirim olarak verilir. */
async function generate(topic) {
  const messages = [{ role: "user", content: userPrompt(topic) }];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const draft = await callModel(messages);
    const problems = validatePost(draft, topic);
    if (problems.length === 0) return { draft, problems: [], attempt };
    if (attempt === 2) return { draft, problems, attempt };

    console.error(`Deneme ${attempt} kapıdan geçemedi:\n - ${problems.join("\n - ")}`);
    messages.push(
      { role: "assistant", content: JSON.stringify(draft) },
      {
        role: "user",
        content:
          `Taslak kalite kapısından geçemedi. Aşağıdaki maddelerin HEPSİNİ düzelt ve ` +
          `yazının tamamını yeniden üret:\n- ${problems.join("\n- ")}`,
      }
    );
  }
  throw new Error("ulaşılamaz");
}

// ---------------------------------------------------------------------------
// Yayın
// ---------------------------------------------------------------------------

function assemble(draft, topic, today) {
  // Alan sırası seed-posts.json ile aynı tutuluyor ki iki dosya yan yana
  // okunduğunda diff gürültüsü olmasın.
  return {
    slug: topic.slug,
    title: topic.title,
    question: topic.question,
    ...(topic.plant ? { plant: topic.plant } : {}),
    category: topic.category,
    date: today,
    keyTakeaway: draft.keyTakeaway,
    excerpt: draft.excerpt,
    keywords: topic.keywords,
    intro: draft.intro,
    sections: draft.sections.map((s) => ({
      heading: s.heading,
      body: s.body,
      ...(s.list?.length ? { list: s.list } : {}),
    })),
    faqs: draft.faqs,
  };
}

function publish(post) {
  const file = readJson("content/generated-posts.json");
  file.posts.push(post);
  writeFileSync(p("content/generated-posts.json"), JSON.stringify(file, null, 2) + "\n", "utf8");
}

function flagForReview(topic, draft, problems) {
  mkdirSync(p("content/rejected-drafts"), { recursive: true });
  writeFileSync(
    p(`content/rejected-drafts/${topic.slug}.json`),
    JSON.stringify({ topic, problems, draft }, null, 2) + "\n",
    "utf8"
  );
  const state = loadState();
  const prev = state.deferred[topic.slug]?.attempts ?? 0;
  state.deferred[topic.slug] = { attempts: prev + 1, problems };
  writeFileSync(p(STATE_PATH), JSON.stringify(state, null, 2) + "\n", "utf8");
}

function emitOutput(kv) {
  if (!process.env.GITHUB_OUTPUT) return;
  for (const [k, v] of Object.entries(kv)) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
  }
}

// ---------------------------------------------------------------------------
// SABOTAJ TESTLERİ — kapının gerçekten kapandığını kanıtlar
// ---------------------------------------------------------------------------

/**
 * Temiz taslak YAYIMLANMIŞ bir yazıdan okunur, elle yazılmaz.
 *
 * Neden? Elle yazılan bir fixture zamanla gerçek içerikten uzaklaşır ve
 * testler "geçiyor" derken kapı gerçek makaleleri reddediyor olabilir.
 * Fixture canlı içerikten gelince bu sapma yapısal olarak imkânsız.
 */
function cleanDraft() {
  const post = readJson("content/seed-posts.json").posts[0];
  return {
    keyTakeaway: post.keyTakeaway,
    excerpt: post.excerpt,
    intro: post.intro,
    sections: post.sections,
    faqs: post.faqs,
  };
}

/** Yayımlanmış bir yazıdan test konusu türet. */
function topicFromPost(post) {
  return {
    slug: post.slug,
    title: post.title,
    question: post.question,
    plant: post.plant,
    category: post.category,
    archetype: "fayda",
    keywords: post.keywords,
    angle: "kalibrasyon",
  };
}

const CLEAN_TOPIC = topicFromPost(readJson("content/seed-posts.json").posts[0]);


/** Derin kopya — sabotajlar birbirini kirletmesin. */
const clone = (x) => JSON.parse(JSON.stringify(x));

const SABOTAGES = [
  {
    name: "1. Uydurma marka rakamı (kuruluş yılı)",
    mutate: (d) => {
      d.sections[0].body.push(
        "İmmu-Nat 1997 yılından bu yana bitkisel ekstrakt üretimi yapmaktadır."
      );
    },
    expect: /doğrulanmamış sayı "1997"/,
  },
  {
    name: "2. Uydurma marka iddiası (rakamsız üstünlük)",
    mutate: (d) => {
      d.sections[1].body.push(
        "İmmu-Nat, Türkiye'nin en büyük bitkisel ekstrakt üreticisi olarak bilinir."
      );
    },
    expect: /künyede yer almayan iddia/,
  },
  {
    name: "3. Uydurma sertifika/onay",
    mutate: (d) => {
      d.faqs[0].a =
        "Immu-Nat ürünleri klinik çalışmalarla onaylı olarak sunulur ve bu sayede güvenle kullanılır. " +
        "Zerdeçal ile safran botanik olarak akraba değildir.";
    },
    expect: /künyede yer almayan iddia/,
  },
  {
    name: "4. Yasak sağlık iddiası (mevzuat ihlali)",
    mutate: (d) => {
      d.keyTakeaway =
        "Zerdeçal iltihabı tedavi eder ve eklem hastalığını iyileştirir. " +
        "Kök kısmı kurutulup toz haline getirilen bir bitkidir. " +
        "Takviye formunda standardize ekstrakt olarak sunulur.";
    },
    expect: /Yasak sağlık iddiası/,
  },
  {
    name: "5. Answer-first bozulması (cevap konuyu içermiyor)",
    mutate: (d) => {
      d.keyTakeaway =
        "Evet, oldukça yararlı olduğu kabul edilir ve pek çok kişi tarafından tercih edilir. " +
        "Kullanımı yaygındır ve kolay bulunur. Pek çok formda satılmaktadır.";
    },
    expect: /konunun adını içermiyor/,
  },
  {
    name: "6. Bağlamsız paragraf (alıntılanamaz açılış)",
    mutate: (d) => {
      d.sections[2].body[0] =
        "Bu nedenle mutfakta çorbalara ve pilavlara eklenir, yağda kavrulunca aroması belirginleşir. " +
        "Uzun süreli yüksek ısıda acı bir tat bırakabilir. Geleneksel tariflerde karabiberle birlikte kullanılır. " +
        "Süt bazlı içeceklerde de sıkça tercih edilir ve renk verir.";
    },
    expect: /belirsiz zamirle başlıyor/,
  },
  {
    name: "7. SSS sayısı 4'ün altına düşürülüyor",
    mutate: (d) => {
      d.faqs = d.faqs.slice(0, 3);
    },
    expect: /SSS; en az 4 olmalı/,
  },
  {
    name: "8. Bölüm başlığı soru formatından çıkarılıyor",
    mutate: (d) => {
      d.sections[0].heading = "Zerdeçalın kökeni";
    },
    expect: /soru formatında değil/,
  },
  {
    name: "9. KONTROL: tire/eğik çizgili kodlar uydurma SAYILMAMALI",
    mutate: (d) => {
      d.sections[3].body.push(
        "İmmu-Nat ürün hattında Curcumin P53 Zerdeçal Ekstraktı ve NAT-EXT NE/01 kodlu formül yer alır."
      );
    },
    expect: null, // hiçbir marka hatası ÜRETMEMELİ
    brandOnly: true,
  },
];

function selfTest() {
  let failed = 0;

  // --- KALİBRASYON ------------------------------------------------------
  // Kapı, YAYIMLANMIŞ ve iyi kabul edilen makaleleri reddediyorsa eşikler
  // yanlıştır. Bu, sabotaj testlerinden daha önemli bir kontrol: yanlış
  // pozitif üreten bir kapı her gün üretimi bloke eder.
  console.log("Kalibrasyon — yayımlanmış makaleler kapıdan geçmeli\n");
  for (const post of readJson("content/seed-posts.json").posts) {
    const problems = validatePost(post, topicFromPost(post));
    console.log(`  ${problems.length ? "HATA" : "OK  "}  ${post.slug}`);
    if (problems.length) {
      failed++;
      problems.forEach((x) => console.log("        · " + x));
    }
  }

  console.log(`\nSabotaj testleri (${SABOTAGES.length} senaryo)\n`);
  for (const s of SABOTAGES) {
    const d = clone(cleanDraft());
    s.mutate(d);
    const problems = validatePost(d, CLEAN_TOPIC);

    if (s.expect === null) {
      // Regresyon testi: bu mutasyon MARKA hatası üretmemeli.
      const brandHits = problems.filter((x) => /doğrulanmamış sayı|künyede yer almayan/.test(x));
      const ok = brandHits.length === 0;
      console.log(`  ${ok ? "OK  " : "HATA"}  ${s.name}`);
      if (!ok) {
        failed++;
        brandHits.forEach((x) => console.log("        · " + x));
      }
      continue;
    }

    const caught = problems.some((x) => s.expect.test(x));
    console.log(`  ${caught ? "OK  " : "HATA"}  ${s.name}`);
    if (!caught) {
      failed++;
      console.log(`        beklenen: ${s.expect}`);
      console.log(problems.length ? problems.map((x) => "        · " + x).join("\n") : "        (hiç hata bulunamadı)");
    }
  }

  console.log(failed === 0 ? "\nTÜM SABOTAJ TESTLERİ GEÇTİ" : `\n${failed} TEST BAŞARISIZ`);
  return failed;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes("--self-test")) {
    process.exit(selfTest() ? 1 : 0);
  }

  const topic = pickTopic();
  if (!topic) {
    console.log("Backlog'da uygun konu kalmadı.");
    emitOutput({ status: "empty" });
    return;
  }

  if (argv.includes("--next")) {
    console.log(JSON.stringify(topic, null, 2));
    return;
  }

  console.log(`Konu: ${topic.slug}  (${topic.archetype}, tier ${topic.tier}, model ${MODEL})`);

  const { draft, problems, attempt } = await generate(topic);

  if (problems.length) {
    console.error(`\nKALİTE KAPISI REDDETTİ (${attempt} deneme):`);
    problems.forEach((x) => console.error(" - " + x));
    if (!argv.includes("--dry-run")) flagForReview(topic, draft, problems);
    emitOutput({ status: "rejected", slug: topic.slug });
    process.exit(1);
  }

  // Tarih GitHub Action'ın çalıştığı gün; UTC sabit, TZ'ye bağlı kaymaz.
  const today = new Date().toISOString().slice(0, 10);
  const post = assemble(draft, topic, today);

  if (argv.includes("--dry-run")) {
    console.log(`\nKapıdan geçti (${attempt}. denemede). --dry-run, yazılmadı.`);
    console.log(JSON.stringify(post, null, 2));
    emitOutput({ status: "dry-run", slug: topic.slug });
    return;
  }

  publish(post);
  console.log(`\nYayımlandı: ${topic.slug} (${attempt}. denemede geçti)`);
  emitOutput({ status: "published", slug: topic.slug, title: topic.title });
}

main().catch((err) => {
  console.error(err.message);
  emitOutput({ status: "error" });
  process.exit(1);
});
