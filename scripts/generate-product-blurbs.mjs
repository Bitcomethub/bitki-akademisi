#!/usr/bin/env node
/**
 * Ürün kartı açıklaması üreticisi.
 *
 * NE ÜRETİYOR?
 *   products[].kisaFayda        — 44 tekli ürün için 1-2 cümle: bitkinin
 *                                 geleneksel/bilinen kullanım alanı.
 *   natExt[].nedenBuKarisim     — 11 NAT-EXT formülü için 2-3 cümle: bu
 *                                 bileşenler NEDEN bir arada sunuluyor.
 *
 * NEDEN ELLE YAZILMIYOR?
 * 55 metni elle yazmak, 55 farklı üslupta 55 farklı risk demek. Üretim
 * otomatik olunca tek bir kapı hepsini aynı ölçüde denetliyor ve kural
 * değiştiğinde 55'i birden yeniden denetleyebiliyoruz (--self-test).
 *
 * KAPI NEREDE?
 * İddia taramalarının tamamı scripts/lib/claim-gate.mjs'den geliyor —
 * generate-blog-post.mjs ile BİREBİR AYNI kod. Yasak sağlık iddiaları,
 * uydurma kanıt, doz, marka rakamı ve karışım bileşeni kuralları makalede
 * ne anlama geliyorsa burada da aynısını ifade eder. Kuralı kopyalasaydık,
 * birinde düzeltilen bir yanlış pozitif diğerinde yaşamaya devam ederdi.
 *
 * BU DOSYADAKİ EK KURALLAR (kartlara özgü, makalede karşılığı yok)
 *   · uzunluk: kart iki satır; 1-2 (ürün) / 2-3 (karışım) cümle
 *   · KONU ÇAPASI: metin kendi ürününün adını/bitkisini anmak ZORUNDA
 *   · DOĞRULANMAMIŞ BİTKİ ADI YASAK: bir ürün açıklaması yalnızca o ürünün
 *     künyesinde geçen bitkiyi anabilir. İçeriği künyede doğrulanmamış
 *     ürünlerde (XP Tonis, Phyto Sist…) HİÇBİR bitki adı geçemez.
 *   · CİDDİ HASTALIK ADI YASAK: takviye ürününü adı konmuş bir hastalığa
 *     bağlamak mevzuatın en sert yasağı; kart formatında bağlam da yok.
 *   · PAZARLAMA ABARTISI YASAK: kart bir reklam değil, bilgi.
 *
 * Kullanım:
 *   node scripts/generate-product-blurbs.mjs --self-test  # API'siz sabotaj testleri
 *   node scripts/generate-product-blurbs.mjs --verify     # depodaki metinleri denetle
 *   node scripts/generate-product-blurbs.mjs              # eksikleri üret + JSON'a yaz
 *   node scripts/generate-product-blurbs.mjs --dry-run    # üret, yazma
 *   node scripts/generate-product-blurbs.mjs --force      # var olanları da yenile
 *   node scripts/generate-product-blurbs.mjs --limit 3    # ilk N ürün (deneme)
 */
import { readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  p,
  facts,
  fold,
  wc,
  sentences,
  stems,
  DANGLING_START,
  ATTRIBUTION_RE,
  plantAllowed,
  plantsMentioned,
  scanBrandFacts,
  scanHealthClaims,
  scanFabricatedEvidence,
  scanDoseFigures,
  scanClaimHedging,
  scanMixtureContents,
} from "./lib/claim-gate.mjs";

/** Model seçimi generate-blog-post.mjs ile aynı gerekçeye dayanır: kaliteyi
 *  model değil KAPI korur, o yüzden varsayılan ucuz olan. */
const MODEL = process.env.BLURB_MODEL || "claude-sonnet-5";

const FACTS_PATH = "content/brand-facts.json";
const PRODUCT_FIELD = "kisaFayda";
const NATEXT_FIELD = "nedenBuKarisim";

/** Yazarken korunmayan (yeniden üretilebilir) alanlar — bütünlük kontrolünde
 *  karşılaştırma dışı bırakılır. */
const GENERATED_KEYS = new Set([PRODUCT_FIELD, NATEXT_FIELD, "_blurbVerification"]);

// ---------------------------------------------------------------------------
// Kart kuralları
// ---------------------------------------------------------------------------

/**
 * Uzunluk. Kart yüksekliği sabit değil ama okunabilirlik sabit: ürün adının
 * altında üç satırı geçen metin kartı listeye değil makaleye çevirir.
 * Türkçe eklemeli olduğu için kelime sayısı İngilizceye göre düşük tutuldu.
 */
const LIMITS = {
  product: { words: [12, 45], sentences: [1, 2] },
  natext: { words: [22, 65], sentences: [2, 3] },
};

/**
 * İçeriği KÜNYEDE DOĞRULANMAMIŞ ürünlerin `plant` etiketleri.
 * Bunlar bitki adı değil, "bilmiyoruz" demenin katalogdaki biçimi. Böyle bir
 * üründe hiçbir bitki adı yazılamaz — çünkü hangi bitkinin içinde olduğunu
 * doğrulayan bir kaynak yok. Eksik bilgi tamam, uydurulmuş bilgi asla.
 */
const UNVERIFIED_CONTENT = new Set(["karışım", "meyve karışımı", "arı ürünleri"]);

/**
 * Adı konmuş hastalıklar. Kartta bağlam yok: "X hastalığı" yazan iki satır,
 * okuyucunun gözünde doğrudan bir endikasyon beyanına dönüşür ve Türk Gıda
 * Kodeksi'nin yasakladığı tam olarak budur.
 *
 * Liste "organ/işlev" adlarını İÇERMEZ (karaciğer, sindirim, bağışıklık):
 * onlar işlev desteğidir ve ihtimal kipiyle yazılabilir. Yasak olan HASTALIK.
 *
 * "inme" bilerek YOK: "inmek" fiili masum cümlelerde geçebilir ve aynı riski
 * "felç" zaten kapatıyor. Yanlış pozitif, kaçırılan sabotajdan daha pahalı.
 */
const SERIOUS_CONDITIONS = [
  "kanser", "tumor", "metastaz", "kemoterapi", "radyoterapi",
  "diyabet", "seker hastalig", "insulin direnci", "hipertansiyon", "tansiyon",
  "alzheimer", "parkinson", "demans", "epilepsi", "multipl skleroz",
  "kalp krizi", "felc", "hashimoto", "tiroit", "tiroid", "guatr",
  "hepatit", "siroz", "astim", "covid", "koronavirus",
  "depresyon", "anksiyete bozuklug", "hiv", "aids",
  "prostat", "bobrek tasi", "safra tasi", "ulser", "gastrit", "reflu",
  "romatizma", "artrit", "egzama", "sedef", "migren", "kansizlik", "osteoporoz",
];
// Sonda \b YOK: Türkçe ek alır ("kanserde", "migreni"). Başta \b VAR ki
// "hipertansiyon" içindeki "tansiyon" ayrıca eşleşmesin.
const SERIOUS_RE = new RegExp(`\\b(${SERIOUS_CONDITIONS.join("|")})`);

/**
 * Pazarlama abartısı. "en iyi" BİLEREK listede değil: "en iyi bilinen
 * bitkilerden biri" dürüst ve yaygın bir kuruluş, onu reddeden kural
 * içeriğin efendisi olurdu. Listedekilerin dürüst bir kullanımı yok.
 */
const PUFFERY_RE =
  /\b(en etkili|en guclu|en faydali|essiz|benzersiz|mucizevi|harika|inanilmaz|birebir|super|muhtesem)\b/;

const range = (n, [lo, hi]) => n >= lo && n <= hi;

// ---------------------------------------------------------------------------
// Hedefler — her üretim biriminin doğrulama bağlamı
// ---------------------------------------------------------------------------

/**
 * Bir ürün için "hangi bitki adları meşru?" sorusunun cevabı, ürünün KENDİ
 * künyesinden türetilir: plant alanı + ürün adı. Başka hiçbir kaynak yok.
 */
function productTarget(product) {
  const generic = UNVERIFIED_CONTENT.has(product.plant.toLocaleLowerCase("tr"));
  const allowedFolded = [
    ...String(product.plant).split("/").map((s) => fold(s.trim())),
    fold(product.name),
  ].filter(Boolean);

  return {
    kind: "product",
    key: product.name,
    field: PRODUCT_FIELD,
    product,
    generic,
    // Çapa: gerçek bitkide bitkinin ADI, içeriği bilinmeyen üründe ÜRÜN adı.
    // "Ekinezya Ekstraktı" adından çapa üretmek işe yaramaz — "ekstrakt"
    // kökü her metinde geçer ve kural sessizce etkisiz kalırdı.
    subjectStems: stems(generic ? product.name : product.plant),
    allowedFolded: generic ? [] : allowedFolded,
    verifiedPlants: generic ? [] : [product.plant],
  };
}

function natExtTarget(formula) {
  return {
    kind: "natext",
    key: formula.code,
    field: NATEXT_FIELD,
    formula,
    generic: false,
    subjectStems: [],
    allowedFolded: formula.contents.map(fold),
    verifiedPlants: formula.contents,
    // "Neden bu karışım?" sorusunun cevabı en az iki bileşeni anmak zorunda —
    // tek bileşen anan bir metin karışımı değil, bitkiyi anlatıyordur.
    minContents: Math.min(2, formula.contents.length),
  };
}

// ---------------------------------------------------------------------------
// KAPI
// ---------------------------------------------------------------------------

/**
 * Tek bir kart metnini denetler. Boş dizi dönerse metin yayına uygundur.
 * Dışa AÇILMIYOR: bu dosya da main()'i modül düzeyinde çağırıyor, import
 * eden her yer üretimi tetiklerdi. Paylaşılması gereken kural claim-gate'te.
 */
function validateBlurb(text, target) {
  const problems = [];
  const fail = (m) => problems.push(`[${target.key}] ${m}`);

  if (typeof text !== "string" || !text.trim()) {
    fail("metin boş");
    return problems;
  }

  const folded = fold(text);
  const lim = LIMITS[target.kind];

  // --- B1: biçim --------------------------------------------------------
  const n = wc(text);
  if (!range(n, lim.words)) fail(`${n} kelime; ${lim.words.join("-")} olmalı`);
  const sents = sentences(text);
  if (!range(sents.length, lim.sentences)) {
    fail(`${sents.length} cümle; ${lim.sentences.join("-")} olmalı`);
  }
  // Kart tek başına okunur; önünde bağlam yok.
  if (DANGLING_START.test(folded)) {
    fail("belirsiz zamirle başlıyor; kart tek başına okunamaz");
  }
  if (text.includes("?")) fail("soru cümlesi — kart bilgi verir, soru sormaz");

  // --- B2: konu çapası --------------------------------------------------
  // Makaledeki "keyTakeaway konunun adını içermiyor" kuralının kart karşılığı.
  // Ürününü adıyla anmayan bir metin başka bir ürünün altına yapıştırılabilir
  // demektir; kartla metin arasındaki bağ kanıtlanmalı.
  if (target.subjectStems.length && !target.subjectStems.some((st) => folded.includes(st))) {
    fail(`metin kendi konusunu içermiyor (beklenen: "${target.subjectStems.join(" / ")}")`);
  }

  // --- B3: ortak iddia kapısı (makaleyle BİREBİR aynı kod) --------------
  const fields = [{ label: target.field, text }];
  problems.push(...scanBrandFacts(fields));
  problems.push(...scanHealthClaims(fields));
  problems.push(...scanFabricatedEvidence(fields));
  problems.push(...scanDoseFigures(fields));
  problems.push(...scanClaimHedging(fields));
  problems.push(...scanMixtureContents(fields));

  // --- B4: dayanak türü — KART BAŞINA -----------------------------------
  // Makalede bu kural yazı DÜZEYİNDE işliyor (bir kez beyan yeter), burada
  // KART düzeyinde: her kart bağımsız bir yayın birimi, birinin dayanağı
  // diğerine miras kalmaz.
  if (!ATTRIBUTION_RE.test(folded)) {
    fail(
      'kaynak türü beyanı yok ("geleneksel olarak", "halk hekimliğinde", ' +
        '"araştırmalarda incelenmektedir" gibi bir çerçeve zorunlu)'
    );
  }

  // --- B5: ciddi hastalık adı ------------------------------------------
  const cond = folded.match(SERIOUS_RE);
  if (cond) fail(`hastalık adı "${cond[1]}" — kartta endikasyon beyanına dönüşür`);

  // --- B6: pazarlama abartısı ------------------------------------------
  const puff = folded.match(PUFFERY_RE);
  if (puff) fail(`abartılı pazarlama ifadesi "${puff[1]}"`);

  // --- B7: doğrulanmamış bitki adı --------------------------------------
  for (const { name, folded: fp } of plantsMentioned(folded)) {
    if (!plantAllowed(fp, target.allowedFolded)) {
      fail(
        target.generic
          ? `içeriği künyede doğrulanmamış üründe bitki adı "${name}"`
          : `doğrulanmamış bitki adı "${name}" — künyede yalnızca ` +
            `${target.verifiedPlants.join(", ")} var`
      );
    }
  }

  // --- B8: karışım gerçekten anlatılıyor mu? ----------------------------
  if (target.kind === "natext") {
    const mentioned = plantsMentioned(folded);
    const covered = target.formula.contents.filter((c) =>
      mentioned.some((m) => plantAllowed(m.folded, [fold(c)]))
    );
    if (covered.length < target.minContents) {
      fail(
        `${covered.length} bileşen anılmış; en az ${target.minContents} olmalı ` +
          `("neden bu karışım" sorusu tek bileşenle cevaplanamaz)`
      );
    }
  }

  return problems;
}

// ---------------------------------------------------------------------------
// Üretim
// ---------------------------------------------------------------------------

const OUTPUT_SCHEMA = {
  type: "object",
  properties: { blurb: { type: "string" } },
  required: ["blurb"],
  additionalProperties: false,
};

function systemPrompt() {
  return `Sen Bitki Akademisi'nin (${facts.site.url}) editörüsün. /urunler sayfasındaki ürün kartlarında görünecek KISA açıklamalar yazıyorsun.

## Metnin işlevi
Ürün adının hemen altında, satın alma bağlantısının yanında duracak. Okuyucu yalnızca bu iki satıra bakarak ürünün ne işe yaradığını anlayabilmeli. Metin TEK BAŞINA okunur: öncesinde bağlam, sonrasında açıklama yoktur. Bu bir reklam değil, bir bilgi satırıdır.

## Mutlak kurallar
1. HASTALIK İDDİASI YASAK. Türk Gıda Kodeksi Beslenme ve Sağlık Beyanları Yönetmeliği takviye üründe hastalık tedavi/önleme beyanını yasaklar.
2. HER CÜMLE AKTARIM YA DA İHTİMAL KİPİNDE. "güçlendirir" değil "desteklemeye yönelik kullanılır"; "azaltır" değil "yardımcı olabileceği aktarılır". Kesin kipte yazılmış tek bir etki cümlesi metni tamamen reddettirir.
3. DAYANAK TÜRÜ ZORUNLU. Her metinde en az bir kez şu çerçevelerden biri geçmeli: "geleneksel olarak", "geleneksel kullanımında", "halk hekimliğinde", "halk arasında", "araştırmalarda incelenmektedir". Kaynağın TÜRÜNÜ söyle; KÜNYESİNİ ASLA uydurma.
4. SPESİFİK KANIT UYDURMAK EN AĞIR İHLAL. Yüzde oranı, tarih, çalışma adı, dergi/üniversite adı, katılımcı sayısı, "kat daha etkili" YAZILAMAZ.
5. RAKAM KULLANMA. Doz ("500 mg", "10 damla") ve ambalaj bilgisi ("250 ml") kartta yeri olmayan bilgilerdir.
6. ADI KONMUŞ HASTALIK YAZMA. Şunlar ve benzerleri yasak: ${SERIOUS_CONDITIONS.slice(0, 20).join(", ")} ve diğer tüm hastalık adları. Bunun yerine İŞLEV yaz: "sindirim", "bağışıklık", "karaciğer fonksiyonu", "uyku düzeni".
7. PAZARLAMA ABARTISI YOK: "en etkili", "eşsiz", "benzersiz", "mucizevi", "harika", "birebir" gibi ifadeler kullanılamaz.
8. YALNIZCA İZİN VERİLEN BİTKİ ADLARI. Sana verilen listede olmayan hiçbir bitki adını yazamazsın — bir ürüne künyesinde bulunmayan bir bitkiyi iliştirmek, okuyucunun satın aldığı üründe olmayan bir şeyi beklemesi demektir.
9. BELİRSİZ ZAMİRLE BAŞLAMA. "Bu", "Bunlar", "Ayrıca", "Ancak" ile başlayan bir kart bağlamsız okunamaz. İlk kelime konunun adı olsun.
10. SORU CÜMLESİ VE ÜNLEM YOK.
11. MARKA HAKKINDA HİÇBİR ŞEY YAZMA. İmmu-Nat'ın büyüklüğü, sertifikası, ödülü, geçmişi kartta geçemez.

## Birebir yasaklı ifadeler
${facts.bannedHealthClaims.join(" · ")}

## Üslup
Sade, ölçülü, bilgi veren. Sıfat yığma yok. Okuyucuya "şunu al" demiyorsun, "bu bitki geleneksel olarak ne için kullanılır" diyorsun.`;
}

function userPrompt(target) {
  if (target.kind === "natext") {
    const { formula } = target;
    return `Aşağıdaki NAT-EXT formülü için kart açıklaması yaz.

FORMÜL: Nat-Ext ${formula.code}
İÇERİK (künyeden birebir, eksiksiz): ${formula.contents.join(", ")}

GÖREV: Bu bileşenlerin NEDEN BİR ARADA sunulduğunu açıkla. Ortak kullanım
alanları nedir, hangi işleve yönelik geleneksel olarak birlikte anılırlar?
Bileşenlerden en az ${target.minContents} tanesini adıyla an.

İZİN VERİLEN BİTKİ ADLARI (başka hiçbir bitki adı yazma): ${formula.contents.join(", ")}

UZUNLUK: ${LIMITS.natext.sentences.join("-")} cümle, toplam ${LIMITS.natext.words.join("-")} kelime.
İLK KELİME bir bileşenin adı olsun.`;
  }

  const { product } = target;
  const base = `Aşağıdaki ürün için kart açıklaması yaz.

ÜRÜN ADI: ${product.name}
KATALOGDAKİ BİTKİ: ${product.plant}`;

  if (target.generic) {
    return `${base}

DİKKAT — BU ÜRÜNÜN İÇERİĞİ KÜNYEDE DOĞRULANMAMIŞTIR. Hangi bitkileri
içerdiğini bilmiyoruz. Bu yüzden HİÇBİR BİTKİ ADI YAZAMAZSIN. Ürünün
biçimini (bitkisel ekstrakt karışımı) ve içeriğin ürün etiketinde yer
aldığını, geleneksel kullanım çerçevesinde ölçülü bir dille anlat.

UZUNLUK: ${LIMITS.product.sentences.join("-")} cümle, toplam ${LIMITS.product.words.join("-")} kelime.
İLK KELİME ürünün adı olsun ("${product.name}" ifadesi metinde geçmeli).`;
  }

  return `${base}

GÖREV: ${product.plant} bitkisinin geleneksel/bilinen kullanım alanını anlat.
Hangi işleve yönelik olarak geleneksel kullanımda tercih edilir?

İZİN VERİLEN BİTKİ ADI (başka hiçbir bitki adı yazma): ${product.plant}

UZUNLUK: ${LIMITS.product.sentences.join("-")} cümle, toplam ${LIMITS.product.words.join("-")} kelime.
İLK KELİME "${product.plant}" olsun.`;
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
      max_tokens: 1000,
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
  return JSON.parse(text).blurb;
}

/** İki deneme: ilkinin kapı hataları geri bildirim olarak modele verilir. */
async function generateOne(target) {
  const messages = [{ role: "user", content: userPrompt(target) }];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = await callModel(messages);
    const problems = validateBlurb(text, target);
    if (problems.length === 0) return { text, problems: [], attempt };
    if (attempt === 2) return { text, problems, attempt };

    messages.push(
      { role: "assistant", content: JSON.stringify({ blurb: text }) },
      {
        role: "user",
        content:
          `Metin kalite kapısından geçemedi. Aşağıdaki maddelerin HEPSİNİ ` +
          `düzelt ve metni yeniden yaz:\n- ${problems.join("\n- ")}`,
      }
    );
  }
  throw new Error("ulaşılamaz");
}

// ---------------------------------------------------------------------------
// JSON'a yazma
// ---------------------------------------------------------------------------

/**
 * brand-facts.json CERRAHİ olarak güncellenir, yeniden serileştirilmez.
 *
 * JSON.stringify(facts, null, 2) dosyanın elle kurulmuş biçimini bozardı:
 * her ürün bugün TEK SATIR ve okunurluğu buradan geliyor; 55 girdiyi altı
 * satıra yaymak diff'i okunamaz hale getirir ve _readme bloklarının hizasını
 * dağıtır. Bunun yerine yalnızca ilgili satır yeniden yazılıyor.
 *
 * Metin düzeyinde düzenleme sessizce bozabilir; bu yüzden yazımdan ÖNCE
 * sonuç parse edilir ve üretilen alanlar dışındaki HER ŞEY eskisiyle birebir
 * karşılaştırılır. Uyuşmazlıkta dosyaya hiç dokunulmaz.
 */
function serializeEntry(obj) {
  const body = Object.entries(obj)
    .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(", ");
  return `{ ${body} }`;
}

const stripGenerated = (o) =>
  JSON.stringify(o, (k, v) => (GENERATED_KEYS.has(k) ? undefined : v));

function writeFacts(blurbs, meta, path = p(FACTS_PATH)) {
  const raw = readFileSync(path, "utf8");
  const before = JSON.parse(raw);
  const lines = raw.split("\n");
  const landed = new Set();

  let out = lines.map((line) => {
    // Tek satırlık girdi nesnesi: `    { "plant": ..., "name": ... },`
    const m = line.match(/^(\s*)(\{.*\})(,?)\s*$/);
    if (!m) return line;
    const [, indent, body, comma] = m;

    let obj;
    try {
      obj = JSON.parse(body);
    } catch {
      return line;
    }
    const hit = blurbs.get(obj.code ?? obj.name);
    if (!hit) return line;

    // Alanı sil + yeniden ekle: yeniden üretimde de her zaman SONDA kalsın,
    // satır başındaki asıl künye (plant/name/asin) göz hizasında dursun.
    const next = { ...obj };
    delete next[hit.field];
    next[hit.field] = hit.text;
    landed.add(obj.code ?? obj.name);
    return `${indent}${serializeEntry(next)}${comma}`;
  });

  if (landed.size !== blurbs.size) {
    const missing = [...blurbs.keys()].filter((k) => !landed.has(k));
    throw new Error(`JSON'da bulunamayan girdi: ${missing.join(", ")}`);
  }

  out = upsertVerification(out, meta);

  const nextRaw = out.join("\n");
  const after = JSON.parse(nextRaw); // bozuk JSON burada patlar, dosya yazılmaz

  if (stripGenerated(after) !== stripGenerated(before)) {
    throw new Error("Cerrahi düzenleme üretilen alanlar dışında bir şeyi değiştirdi — yazılmadı");
  }
  for (const [key, { field, text }] of blurbs) {
    const entry =
      after.products.find((x) => x.name === key) ?? after.natExt.find((x) => x.code === key);
    if (entry?.[field] !== text) throw new Error(`Metin JSON'a doğru yazılmadı: ${key}`);
  }

  writeFileSync(path, nextRaw, "utf8");
  return nextRaw;
}

/** Üretim künyesi TEK SATIR tutulur ki idempotent güncellensin. */
function upsertVerification(lines, meta) {
  const line = `  "_blurbVerification": ${serializeEntry(meta)},`;
  const idx = lines.findIndex((l) => l.startsWith(`  "_blurbVerification":`));
  if (idx >= 0) {
    lines[idx] = line;
    return lines;
  }
  if (!lines.some((l) => l.startsWith(`  "_blurbsReadme":`))) {
    throw new Error('brand-facts.json içinde "_blurbsReadme" bulunamadı');
  }
  // Künye, açıklamasının hemen ardına: okuyan önce "bunlar üretimdir" uyarısını
  // görsün, sonra ne zaman/hangi modelle üretildiğini.
  const anchor = lines.findIndex((l) => l.startsWith(`  "_productsReadme":`));
  if (anchor < 0) throw new Error('brand-facts.json içinde "_productsReadme" bulunamadı');
  return [...lines.slice(0, anchor), line, "", ...lines.slice(anchor)];
}

// ---------------------------------------------------------------------------
// SABOTAJ TESTLERİ
// ---------------------------------------------------------------------------

const T_PRODUCT = () => productTarget(facts.products.find((x) => x.plant === "Ekinezya"));
const T_GENERIC = () => productTarget(facts.products.find((x) => x.name === "XP Tonis H-B"));
const T_NE = (code) => natExtTarget(facts.natExt.find((x) => x.code === code));

const CLEAN_PRODUCT =
  "Ekinezya, bağışıklık sistemini desteklemeye yönelik geleneksel kullanımıyla bilinir " +
  "ve özellikle mevsim geçişlerinde tercih edilir.";

const CLEAN_NATEXT =
  "Deve dikeni, enginar yaprağı ve hindiba geleneksel olarak karaciğer ve safra " +
  "fonksiyonunu desteklemek amacıyla birlikte kullanılır. Enginar ile deve dikeni " +
  "safra akışına yönelik kullanımıyla, hindiba ise sindirimi desteklemeye yönelik " +
  "kullanımıyla bilinir.";

const SABOTAGES = [
  {
    name: "1. Yasak sağlık iddiası (mevzuat ihlali)",
    target: T_PRODUCT,
    text: "Ekinezya, soğuk algınlığını tedavi eder ve bağışıklık sistemini geleneksel olarak iyileştirir.",
    expect: /Yasak sağlık iddiası/,
  },
  {
    name: "2. Uydurma istatistik (sahte yüzde)",
    target: T_PRODUCT,
    text: "Ekinezya, geleneksel kullanımda kişilerin %70'inde belirgin fark yarattığı aktarılan bir bitkidir.",
    expect: /sayısal yüzde/,
  },
  {
    name: "3. Kesin doz verme",
    target: T_PRODUCT,
    text: "Ekinezya geleneksel olarak günde 500 mg biçiminde kullanılır ve bağışıklığa yönelik tercih edilir.",
    expect: /Kesin doz "500 mg"/,
  },
  {
    name: "4. Kesin kipte sağlık iddiası (ihtimal kipi yok)",
    target: T_PRODUCT,
    text: "Ekinezya bağışıklık sistemini güçlendirir, soğuk algınlığı süresini kısaltır ve vücudu korur.",
    expect: /Kesin kipte sağlık iddiası/,
  },
  {
    name: "5. Kaynak türü beyanı hiç yok",
    target: T_PRODUCT,
    text: "Ekinezya, bağışıklık sistemini desteklemeye yönelik sıkça tercih edilen bir bitkisel ekstrakt ürünüdür.",
    expect: /kaynak türü beyanı yok/,
  },
  {
    name: "6. Karışıma uydurma bileşen (formülde olmayan bitki)",
    target: () => T_NE("NE/09"),
    text:
      "Deve dikeni, enginar yaprağı ve zerdeçal geleneksel olarak karaciğer fonksiyonunu " +
      "desteklemek amacıyla birlikte kullanılır. Hindiba ile birlikte sindirime yönelik tercih edilir.",
    expect: /doğrulanmamış bitki adı "Zerdeçal"/,
  },
  {
    name: "7. Adı konmuş hastalık (endikasyon beyanı)",
    target: T_PRODUCT,
    text: "Ekinezya, geleneksel kullanımda bronşit ve kanser gibi durumlarda destek amacıyla anılır.",
    expect: /hastalık adı "kanser"/,
  },
  {
    name: "8. Konu kayması (metin kendi ürününü anmıyor)",
    target: T_PRODUCT,
    text: "Geleneksel kullanımda sindirimi desteklemeye yönelik tercih edilen bir bitkisel ekstrakt ürünüdür.",
    expect: /kendi konusunu içermiyor/,
  },
  {
    name: "9. Marka üstünlük iddiası",
    target: T_PRODUCT,
    text:
      "Ekinezya, İmmu-Nat'ın Türkiye'nin en büyük üreticisi olarak geleneksel yöntemlerle " +
      "hazırladığı bir ekstrakttır.",
    expect: /künyede yer almayan iddia/,
  },
  {
    name: "10. Uydurma çalışma künyesi (tarih + çalışma)",
    target: T_PRODUCT,
    text: "Ekinezya, 2019 yılında yayımlanan bir çalışmada geleneksel kullanımıyla incelenmiştir.",
    expect: /tarihli çalışma atfı/,
  },
  {
    name: "11. Kart sınırını aşan uzunluk",
    target: T_PRODUCT,
    text:
      "Ekinezya, geleneksel kullanımda bağışıklık sistemini desteklemeye yönelik olarak " +
      "tercih edilen bir bitkidir ve halk hekimliğinde uzun yıllardır anılmaktadır. " +
      "Kök, gövde ve çiçek kısımları farklı biçimlerde değerlendirilir. " +
      "Sıvı ekstrakt formunda sunulduğunda günlük kullanımda pratiklik sağladığı aktarılır. " +
      "Mevsim geçişlerinde yaygın olarak tercih edilen bitkiler arasında yer alır.",
    expect: /kelime;|cümle;/,
  },
  {
    name: "12. Belirsiz zamirle başlıyor (bağlamsız kart)",
    target: T_PRODUCT,
    text: "Bu bitki, geleneksel kullanımda bağışıklığı desteklemeye yönelik anılan ekinezyadır.",
    expect: /belirsiz zamirle başlıyor/,
  },
  {
    name: "13. Var olmayan formül kodu",
    target: () => T_NE("NE/09"),
    text:
      "Deve dikeni, enginar yaprağı ve hindiba NE/17 formülünde geleneksel olarak bir arada " +
      "sunulur. Karaciğer fonksiyonuna yönelik kullanımlarıyla bilinirler.",
    expect: /Var olmayan formül kodu "NE\/17"/,
  },
  {
    name: "14. Karışım tek bileşenle anlatılıyor",
    target: () => T_NE("NE/09"),
    text:
      "Deve dikeni, geleneksel olarak karaciğer fonksiyonunu desteklemeye yönelik " +
      "kullanımıyla bilinir. Formülde diğer bitkilerle birlikte sunulur ve günlük destek " +
      "amacıyla tercih edilir.",
    expect: /bileşen anılmış; en az/,
  },
  {
    name: "15. İçeriği doğrulanmamış üründe bitki adı",
    target: T_GENERIC,
    text:
      "XP Tonis H-B, zerdeçal ve zencefil içeren, geleneksel kullanımda tercih edilen " +
      "bir bitkisel ekstrakt karışımıdır.",
    expect: /içeriği künyede doğrulanmamış üründe bitki adı/,
  },
  {
    name: "16. Pazarlama abartısı",
    target: T_PRODUCT,
    text: "Ekinezya, geleneksel kullanımda bağışıklık için en etkili bitki olarak anılır.",
    expect: /abartılı pazarlama/,
  },

  // --- KONTROL TESTLERİ: kapı DOĞRU içeriği reddetmemeli -----------------
  {
    name: "17. KONTROL: temiz ürün açıklaması geçmeli",
    target: T_PRODUCT,
    text: CLEAN_PRODUCT,
    expectClean: true,
  },
  {
    name: "18. KONTROL: temiz karışım açıklaması geçmeli",
    target: () => T_NE("NE/09"),
    text: CLEAN_NATEXT,
    expectClean: true,
  },
  {
    name: "19. KONTROL: 'garanti etmez' dürüst cümlesi geçmeli",
    target: T_PRODUCT,
    text:
      "Ekinezya geleneksel olarak bağışıklığı desteklemeye yönelik kullanılır; bitkisel " +
      "ürünler bir sonucu garanti etmez.",
    expectNone: /Yasak sağlık iddiası|abartılı pazarlama/,
  },
  {
    name: "20. KONTROL: 'Civan Perçemi' / 'Civanperçemi' yazım farkı reddedilmemeli",
    target: () => T_NE("NE/10"),
    text:
      "Hayıt tohumu, civanperçemi ve biberiye geleneksel olarak dönemsel destek amacıyla " +
      "birlikte anılır. Üçü bir arada, halk hekimliğinde bilinen kullanımlarıyla sunulur.",
    expectNone: /doğrulanmamış bitki adı|bileşen anılmış/,
  },
  {
    name: "21. KONTROL: 'Ginseng' / 'Panax Ginseng' aynı bitki sayılmalı",
    target: () => T_NE("NE/11"),
    text:
      "Ginseng, çoban çökerten ve karabaş otu geleneksel kullanımda dayanıklılığı " +
      "desteklemeye yönelik anılır. Damar otu ve zencefil ile birlikte sunulur.",
    expectNone: /doğrulanmamış bitki adı|bileşen anılmış/,
  },
  {
    name: "22. KONTROL: işlev adı (karaciğer, sindirim) hastalık SAYILMAMALI",
    target: T_PRODUCT,
    text:
      "Ekinezya, geleneksel kullanımda bağışıklık ve solunum yolu konforuna yönelik " +
      "olarak anılan bir bitkidir.",
    expectNone: /hastalık adı/,
  },
];

/**
 * YAZMA TESTİ — kapı kadar önemli, çünkü buradaki bir hata SESSİZ.
 *
 * writeFacts() JSON'u parse edip yeniden yazmıyor, METİN düzeyinde satır
 * değiştiriyor (dosyanın elle kurulmuş biçimini korumak için). Böyle bir
 * düzenleme yanlış satırı yakalarsa ya da kaçarsa sonuç hâlâ geçerli bir JSON
 * olabilir — yani hata build'i kırmaz, testi kırmaz, yalnızca kanonik gerçek
 * dosyasını bozar. Bu yüzden gerçek dosyanın bir kopyası üzerinde tam tur
 * atılıyor: yaz, geri oku, üretilen alanlar DIŞINDA her şeyin birebir aynı
 * kaldığını ve ikinci çalıştırmanın hiçbir şey eklemediğini (idempotans)
 * doğrula. API anahtarı gerektirmez; üretimden önce koşabilen tek kanıt bu.
 */
function writeRoundTripTest() {
  const tmp = join(tmpdir(), "bitki-brand-facts-write-test.json");
  copyFileSync(p(FACTS_PATH), tmp);

  const products = facts.products.slice(0, 2);
  const formula = facts.natExt[0];
  const blurbs = new Map([
    [products[0].name, { field: PRODUCT_FIELD, text: CLEAN_PRODUCT }],
    [products[1].name, { field: PRODUCT_FIELD, text: CLEAN_PRODUCT }],
    [formula.code, { field: NATEXT_FIELD, text: CLEAN_NATEXT }],
  ]);
  const meta = { date: "2026-01-01", model: "test", generated: blurbs.size };

  const problems = [];
  try {
    const first = writeFacts(blurbs, meta, tmp);
    const after = JSON.parse(first);

    // 1. Metinler doğru girdilere indi mi?
    for (const [key, { field, text }] of blurbs) {
      const entry =
        after.products.find((x) => x.name === key) ?? after.natExt.find((x) => x.code === key);
      if (entry?.[field] !== text) problems.push(`metin yerine oturmadı: ${key}`);
    }

    // 2. Dokunulmayan girdi sayısı ve künye alanları korundu mu?
    if (after.products.length !== facts.products.length) problems.push("ürün sayısı değişti");
    if (after.natExt.length !== facts.natExt.length) problems.push("formül sayısı değişti");
    if (stripGenerated(after) !== stripGenerated(facts)) {
      problems.push("üretilen alanlar dışında bir şey değişti");
    }

    // 3. Biçim korundu mu? Girdiler TEK SATIR kalmalı, yoksa diff okunamaz.
    const multiline = first
      .split("\n")
      .filter((l) => /^\s{4}\{\s*$/.test(l)).length;
    if (multiline > 0) problems.push(`${multiline} girdi çok satıra yayıldı`);

    // 4. İdempotans: aynı girdiyle ikinci yazım hiçbir şey eklememeli.
    //    (_blurbVerification'ın çoğalması ya da alanın iki kez yazılması.)
    const second = writeFacts(blurbs, meta, tmp);
    if (second !== first) problems.push("ikinci yazım farklı sonuç üretti (idempotan değil)");
    if ((second.match(/"_blurbVerification"/g) ?? []).length !== 1) {
      problems.push("_blurbVerification çoğaldı");
    }
  } catch (err) {
    problems.push(err.message);
  } finally {
    rmSync(tmp, { force: true });
  }

  console.log("\nYazma testi (gerçek dosyanın kopyası üzerinde tam tur)\n");
  if (problems.length === 0) {
    console.log("  OK    yaz → oku → karşılaştır → tekrar yaz");
  } else {
    problems.forEach((x) => console.log("  HATA  " + x));
  }
  return problems.length;
}

function selfTest() {
  let failed = 0;

  // --- KALİBRASYON ------------------------------------------------------
  // Depoda duran GERÇEK metinler kapıdan geçmeli. Kural değiştiğinde bu
  // bölüm, yayındaki 55 kartın hâlâ uyumlu olduğunu kanıtlar; sabotaj
  // testlerinden daha önemlidir, çünkü yanlış pozitif sessizce çalışır.
  const stored = storedBlurbs();
  console.log(`Kalibrasyon — depodaki ${stored.length} açıklama kapıdan geçmeli\n`);
  if (stored.length === 0) {
    console.log("  (henüz üretilmiş açıklama yok)");
  }
  for (const { target, text } of stored) {
    const problems = validateBlurb(text, target);
    if (problems.length) {
      failed++;
      console.log(`  HATA  ${target.key}`);
      problems.forEach((x) => console.log("        · " + x));
    }
  }
  if (stored.length && failed === 0) console.log(`  OK    ${stored.length}/${stored.length}`);

  console.log(`\nSabotaj testleri (${SABOTAGES.length} senaryo)\n`);
  for (const s of SABOTAGES) {
    const problems = validateBlurb(s.text, s.target());
    let ok;

    if (s.expectClean) {
      ok = problems.length === 0;
    } else if (s.expectNone) {
      ok = !problems.some((x) => s.expectNone.test(x));
    } else {
      ok = problems.some((x) => s.expect.test(x));
    }

    console.log(`  ${ok ? "OK  " : "HATA"}  ${s.name}`);
    if (!ok) {
      failed++;
      if (!s.expectClean && !s.expectNone) console.log(`        beklenen: ${s.expect}`);
      console.log(
        problems.length
          ? problems.map((x) => "        · " + x).join("\n")
          : "        (hiç hata bulunamadı)"
      );
    }
  }

  failed += writeRoundTripTest();

  console.log(failed === 0 ? "\nTÜM TESTLER GEÇTİ" : `\n${failed} TEST BAŞARISIZ`);
  return failed;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/** Depoda metni bulunan her ürün/formül, doğrulama bağlamıyla birlikte. */
function storedBlurbs() {
  return [
    ...facts.products
      .filter((x) => typeof x[PRODUCT_FIELD] === "string")
      .map((x) => ({ target: productTarget(x), text: x[PRODUCT_FIELD] })),
    ...facts.natExt
      .filter((x) => typeof x[NATEXT_FIELD] === "string")
      .map((x) => ({ target: natExtTarget(x), text: x[NATEXT_FIELD] })),
  ];
}

function allTargets() {
  return [
    ...facts.products.map(productTarget),
    ...facts.natExt.map(natExtTarget),
  ];
}

function currentText(target) {
  return target.kind === "product"
    ? target.product[PRODUCT_FIELD]
    : target.formula[NATEXT_FIELD];
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => argv.includes(name);
  const value = (name) => {
    const hit = argv.find((a) => a.startsWith(`${name}=`));
    return hit ? hit.slice(name.length + 1) : null;
  };

  if (flag("--self-test")) process.exit(selfTest() ? 1 : 0);

  if (flag("--verify")) {
    const stored = storedBlurbs();
    let bad = 0;
    for (const { target, text } of stored) {
      const problems = validateBlurb(text, target);
      if (problems.length) {
        bad++;
        console.error(`HATA ${target.key}`);
        problems.forEach((x) => console.error("  · " + x));
      }
    }
    console.log(`${stored.length} açıklama denetlendi, ${bad} hatalı.`);
    process.exit(bad ? 1 : 0);
  }

  let targets = allTargets();
  const only = value("--only");
  if (only) targets = targets.filter((t) => t.key === only);
  if (!flag("--force")) targets = targets.filter((t) => !currentText(t));
  const limit = Number(value("--limit") || 0);
  if (limit > 0) targets = targets.slice(0, limit);

  if (targets.length === 0) {
    console.log("Üretilecek açıklama yok (hepsi mevcut; yenilemek için --force).");
    return;
  }

  console.log(`${targets.length} açıklama üretilecek (model ${MODEL})\n`);

  const blurbs = new Map();
  const rejected = [];

  for (const [i, target] of targets.entries()) {
    const tag = `${String(i + 1).padStart(2, " ")}/${targets.length} ${target.key}`;
    try {
      const { text, problems, attempt } = await generateOne(target);
      if (problems.length) {
        rejected.push({ key: target.key, problems, text });
        console.log(`  RED  ${tag} (${attempt} deneme)`);
        problems.forEach((x) => console.log("        · " + x));
        continue;
      }
      blurbs.set(target.key, { field: target.field, text });
      console.log(`  OK   ${tag}${attempt > 1 ? ` (${attempt}. denemede)` : ""}`);
    } catch (err) {
      rejected.push({ key: target.key, problems: [err.message], text: null });
      console.log(`  HATA ${tag}: ${err.message}`);
    }
  }

  console.log(`\nKapıdan geçen: ${blurbs.size}/${targets.length}`);
  if (rejected.length) console.log(`Reddedilen: ${rejected.map((r) => r.key).join(", ")}`);

  if (flag("--dry-run")) {
    console.log("\n--dry-run: JSON'a yazılmadı.\n");
    for (const [key, { text }] of blurbs) console.log(`${key}\n  ${text}\n`);
    return;
  }

  if (blurbs.size === 0) return;

  const stored = storedBlurbs().length;
  writeFacts(blurbs, {
    date: new Date().toISOString().slice(0, 10),
    model: MODEL,
    generated: stored + blurbs.size,
    gate: "node scripts/generate-product-blurbs.mjs --self-test",
    note:
      "Bu iki alan (kisaFayda / nedenBuKarisim) LLM üretimidir, künye kaydı DEĞİLDİR; " +
      "kalite kapısından geçmiş metinlerdir. Kural değişirse --verify ile yeniden denetlenir.",
  });
  console.log(`\n${FACTS_PATH} güncellendi.`);

  if (rejected.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
