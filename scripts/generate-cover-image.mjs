#!/usr/bin/env node
/**
 * Blog kapak fotoğrafı üretimi — fal.ai (FLUX).
 *
 * KULLANIM
 *   node scripts/generate-cover-image.mjs --missing          # görseli olmayan tüm yazılar
 *   node scripts/generate-cover-image.mjs --slug=zerdecal-...  # tek yazı
 *   node scripts/generate-cover-image.mjs --missing --force     # var olanları da yeniden üret
 *   FAL_MODEL=fal-ai/flux-pro/v1.1 node scripts/... --missing   # model değiştir
 *
 * NEDEN AYRI SCRIPT, NEDEN BUILD SIRASINDA DEĞİL?
 * Görsel üretimi ağ ister, para harcar ve saniyeler sürer. Build'e koymak her
 * deploy'u fal.ai'nin çalışır olmasına bağımlı kılardı ve aynı görsel için
 * defalarca ödeme yapardık. Görseller BİR KEZ üretilip repoya statik dosya
 * olarak commit ediliyor; build hiçbir zaman fal.ai'ye istek atmıyor.
 *
 * NEDEN post'ta `image` ALANI YOK, DOSYA VARLIĞINA BAKILIYOR?
 * Yol slug'dan türetiliyor (public/images/blog/<slug>.jpg) ve sayfa o dosya
 * GERÇEKTEN DİSKTE VARSA fotoğrafı gösteriyor. Bir JSON alanı olsaydı, makaleyi
 * üreten LLM oraya var olmayan bir yol yazabilirdi ve sayfada kırık görsel
 * çıkardı. Dosya varlığı taklit edilemez: model dosya oluşturamaz. Bu, projedeki
 * amazonUrl ve /kapak/<slug>.png ile aynı uydurma-karşıtı desen.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { visualFor, isKnownPlant, GENERIC_SUBJECT } from "./plant-visuals.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMAGE_DIR = join(ROOT, "public", "images", "blog");

/* ---------------------------------------------------------------- ortam --- */

/** .env.local'i elle oku — CI'da bu dosya yok, orada değişken ortamdan gelir. */
function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const FAL_KEY = process.env.FAL_KEY;

/**
 * Varsayılan model NEDEN schnell DEĞİL?
 * schnell 4 adımda üretir ve ucuzdur (~$0.003), ama fotogerçekçilikte belirgin
 * biçimde zayıf: ilk denemede zerdeçal köksapları kartondan boru gibi çıktı.
 * Sitenin tek sermayesi güvenilirlik olduğu için "yapay duran" kapak doğrudan
 * zarar. flux-pro görsel başına ~$0.04; günde bir makale demek AYDA ~$1.2,
 * 128 makalelik backlog'un tamamı ~$5. Kalite farkının yanında ihmal edilebilir.
 * schnell hızlı denemeler için FAL_MODEL ile hâlâ seçilebilir.
 */
const MODEL = process.env.FAL_MODEL || "fal-ai/flux-pro/v1.1";

/* --------------------------------------------------------------- prompt --- */

/**
 * "YAPAY GÖRÜNÜM" KARŞITI PROMPT KURALLARI.
 *
 * Görsel modellerini CGI/render estetiğine iten kelimeler bellidir:
 * "hyperrealistic", "8k", "ultra detailed", "award winning", "stunning",
 * "vibrant", "cinematic lighting", "trending on artstation". Bunlar kaliteyi
 * artırmaz, görüntüyü doygun ve plastik yapar — bakan kişi anında "bu yapay"
 * der ve o an içeriğe olan güven de düşer. Bu yüzden hiçbiri KULLANILMIYOR.
 *
 * Yerine gerçek fotoğrafın nasıl tarif edildiği yazılıyor: ekipman, ışık,
 * alan derinliği, kusur. "Film grain" ve "natural imperfections" özellikle
 * önemli — yapay görüntülerin en belirgin işareti kusursuz temizlikleri.
 */
const STYLE = [
  "documentary botanical photography for a printed herbal reference book",
  "shot on a 50mm lens at f/2.8, shallow depth of field",
  "soft diffused natural daylight from a window, no studio flash",
  "muted natural colours, gentle contrast, subtle film grain",
  "visible surface texture, natural imperfections, a few loose fragments",
  "off-centre composition with generous negative space on the left",
  "shallow overhead angle on a matte neutral surface",
].join(", ");

/**
 * SAHNE KISITI — ve neden "no X" biçiminde YAZILMIYOR.
 *
 * İlk sürümde dışlamalar açık yasak olarak yazılmıştı: "no packaging,
 * no bottles, no supplement capsules or pills". Sonuç tam tersi oldu —
 * ekinezya kapağının sağ alt köşesinde takviye kapsülleri belirdi.
 *
 * Sebep: FLUX negatif prompt DESTEKLEMİYOR. Prompt tek bir metin akışı olarak
 * kodlanıyor ve "no" kelimesinin ayrı bir olumsuzlama gücü yok; geriye kalan
 * şey modelin gördüğü "capsules, pills, bottles" kelimeleri oluyor. Yani
 * yasaklamak, yasaklanan nesneyi sahneye ÇAĞIRIYOR. (SDXL ailesinin ayrı bir
 * negative_prompt alanı vardır, FLUX'ta yoktur — teknik alışkanlığın yanlış
 * modele taşınması klasik hatası.)
 *
 * Doğru yol: yasak değil, sahneyi tam olarak doldurmak. Karede ne OLDUĞUNU
 * eksiksiz söylersen, olmayacak şeye yer kalmıyor. Ambalajın uzak tutulması
 * ayrıca ilkesel: uydurma bir takviye şişesi, var olmayan bir ürünün görselini
 * üretmek olurdu — metinde marka bilgisi uydurmayı yasaklarken görselde ürün
 * uydurmak tutarsız olurdu.
 */
const SCENE =
  "the botanical material is the only subject in the frame and rests directly " +
  "on a plain matte surface that is otherwise completely empty";

export function buildPrompt(post) {
  const visual = visualFor(post.plant);
  const subject = visual
    ? `${visual.subject} (${visual.latin})`
    : GENERIC_SUBJECT;
  return `${subject}. ${SCENE}. ${STYLE}.`;
}

/** Slug'dan deterministik seed — aynı yazı her çalıştırmada aynı görseli alır. */
export function seedFor(slug) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/* ------------------------------------------------------------------ fal --- */

async function generate(prompt, seed) {
  const body = {
    prompt,
    // Hazır "landscape_16_9" 1024×576 veriyor; kart genişliği retina ekranda
    // bunu aşıyor ve görsel yumuşak görünüyor. 1440×810 aynı 16:9 oranında
    // ama 2x kartlarda net; dosya boyutu hâlâ makul.
    image_size: { width: 1440, height: 810 },
    num_images: 1,
    seed,
    output_format: "jpeg",
    enable_safety_checker: true,
  };
  // schnell 4 adımda çalışır; pro bu alanı yok sayar.
  if (MODEL.includes("schnell")) body.num_inference_steps = 4;

  const res = await fetch(`https://fal.run/${MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`fal.ai ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const data = await res.json();
  const image = data.images?.[0];
  if (!image?.url) throw new Error(`fal.ai yanıtında görsel yok: ${JSON.stringify(data).slice(0, 300)}`);
  // NSFW filtresi tetiklenirse fal siyah kare döndürür — sessizce kaydetmeyelim.
  if (data.has_nsfw_concepts?.[0]) throw new Error("Güvenlik filtresi tetiklendi, görsel kullanılmadı");
  return image.url;
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Görsel indirilemedi: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/* ------------------------------------------------------------------ ana --- */

function loadPosts() {
  // Her iki dosya da { _readme, posts: [...] } biçiminde — _readme dosyanın
  // ne olduğunu dosyanın kendi içinde anlatıyor, dizi kökte değil.
  const read = (f) => {
    const p = join(ROOT, "content", f);
    if (!existsSync(p)) return [];
    return JSON.parse(readFileSync(p, "utf8")).posts ?? [];
  };
  return [...read("seed-posts.json"), ...read("generated-posts.json")];
}

export function imagePathFor(slug) {
  return join(IMAGE_DIR, `${slug}.jpg`);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const slugArg = args.find((a) => a.startsWith("--slug="))?.slice(7);
  const missing = args.includes("--missing");

  if (!FAL_KEY) {
    console.error("FAL_KEY yok. .env.local'e ekleyin ya da ortam değişkeni olarak verin.");
    process.exit(1);
  }
  if (!slugArg && !missing) {
    console.error("Kullanım: --missing  ya da  --slug=<slug>  (opsiyonel --force)");
    process.exit(1);
  }

  const posts = loadPosts();
  let targets = slugArg ? posts.filter((p) => p.slug === slugArg) : posts;
  if (slugArg && targets.length === 0) {
    console.error(`Böyle bir yazı yok: ${slugArg}`);
    process.exit(1);
  }
  if (!force) targets = targets.filter((p) => !existsSync(imagePathFor(p.slug)));

  if (targets.length === 0) {
    console.log("Üretilecek görsel yok — hepsi mevcut.");
    return;
  }

  mkdirSync(IMAGE_DIR, { recursive: true });
  console.log(`Model: ${MODEL}\nÜretilecek: ${targets.length} görsel\n`);

  let failed = 0;
  for (const post of targets) {
    // Tabloda anahtarı hiç olmayan bitki = gözden kaçmış. Sessizce jeneriğe
    // düşmek yerine uyarıyoruz; null OLARAK yazılmış olanlar bilinçli tercih.
    if (post.plant && !isKnownPlant(post.plant)) {
      console.warn(`  ! "${post.plant}" plant-visuals tablosunda yok — jenerik görsel kullanılacak`);
    }
    const prompt = buildPrompt(post);
    const seed = seedFor(post.slug);
    process.stdout.write(`  ${post.slug} … `);
    try {
      const url = await generate(prompt, seed);
      writeFileSync(imagePathFor(post.slug), await download(url));
      console.log("tamam");
    } catch (err) {
      failed++;
      console.log(`HATA: ${err.message}`);
    }
  }

  // Kısmi başarı bilinçli olarak kabul ediliyor: bir görsel üretilemezse o yazı
  // CSS şeride düşer, sayfa çalışmaya devam eder. Görsel yok diye makaleyi
  // yayımlamamak, içeriği görselden daha az değerli saymak olurdu.
  if (failed) {
    console.error(`\n${failed} görsel üretilemedi (ilgili yazılar CSS şeride düşecek).`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
