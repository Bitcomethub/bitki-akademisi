/**
 * Makale veri modeli.
 *
 * Eski model `content: string` (HTML blob) idi. Yapısal veriye geçmemizin
 * sebebi kozmetik değil: FAQPage şeması HTML blob'undan TÜRETİLEMEZ. Şemayı
 * elle yazsaydık sayfada görünen metinle JSON-LD zamanla ayrışırdı — bu hem
 * Google yapılandırılmış veri ihlali hem de AI motorları için güven kaybıdır.
 * Bölümler ve SSS'ler veri olduğunda, HTML ve JSON-LD aynı kaynağın iki
 * projeksiyonu olur ve ayrışmaları matematiksel olarak imkânsızdır.
 *
 * İki kaynak dosya var:
 *   content/seed-posts.json       → elle yazılan makaleler
 *   content/generated-posts.json  → günlük pipeline'ın ürettikleri
 * İkisi de JSON çünkü .mjs pipeline'ın mevcut slug'ları okuması gerekiyor;
 * .ts olsaydı regex ile kazımak zorunda kalırdı (Miamili'de böyleydi).
 */
import seedData from "@/content/seed-posts.json";
import generatedData from "@/content/generated-posts.json";
import { amazonUrlFor, isDirectProductLink, productForPlant } from "@/lib/brand-facts";

export type Faq = { q: string; a: string };

export type Section = {
  heading: string;
  body: string[];
  list?: string[];
};

/** JSON dosyalarında birebir bulunan alanlar. */
export type PostSource = {
  slug: string;
  /** SEO başlığı (H1). */
  title: string;
  /** Makalenin cevapladığı ana soru — answer-first kontrolünün referansı. */
  question: string;
  /** Meta description + kart özeti. */
  excerpt: string;
  /** Alıntılanabilir tek paragraflık cevap. AI motorlarının asıl hedefi. */
  keyTakeaway: string;
  date: string;
  updated?: string;
  category: string;
  /** brand-facts.json'daki bir bitki adı. Amazon linki bundan TÜRETİLİR. */
  plant?: string;
  keywords: string[];
  intro: string[];
  sections: Section[];
  faqs: Faq[];
};

/** Uygulamanın gördüğü tip: ham alanlar + türetilmiş marka alanları. */
export type Post = PostSource & {
  amazonUrl?: string;
  productName?: string;
  /** Link doğrudan ürün sayfasına mı gidiyor, arama sonucuna mı? */
  amazonIsDirect?: boolean;
};

/**
 * JSON modüllerinin çıkarsanan tipi ile PostSource arasında `unknown`
 * üzerinden köprü kuruyoruz. Şema garantisi TS'ten değil, üretim
 * script'indeki kalite kapısından gelir — makale yayımlanmadan önce
 * validatePost() tüm alanları doğrular.
 */
const seedSources = (seedData.posts as unknown) as PostSource[];
const generatedSources = (generatedData.posts as unknown) as PostSource[];

/**
 * Seed önce gelir: aynı slug iki dosyada da varsa elle yazılan kazanır.
 * (Pipeline zaten mevcut slug'ları atlar, bu ikinci savunma hattı.)
 */
function mergeSources(): PostSource[] {
  const bySlug = new Map<string, PostSource>();
  for (const post of [...seedSources, ...generatedSources]) {
    if (!bySlug.has(post.slug)) bySlug.set(post.slug, post);
  }
  return [...bySlug.values()];
}

/**
 * Amazon linki makalede SAKLANMAZ, bitki adından türetilir. Böylece üretilen
 * bir makale ürün URL'i uyduramaz — yalnızca kataloğa ait bir bitki adı
 * verebilir; katalogda yoksa link hiç oluşmaz.
 */
function hydrate(source: PostSource): Post {
  const product = source.plant ? productForPlant(source.plant) : undefined;
  return {
    ...source,
    amazonUrl: product ? amazonUrlFor(product) : undefined,
    productName: product?.name,
    amazonIsDirect: product ? isDirectProductLink(product) : undefined,
  };
}

export const posts: Post[] = mergeSources().map(hydrate);

export function getAllPosts(): Post[] {
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

/** Aynı kategoriyi önceler, yetmezse en yeni yazılarla tamamlar. */
export function getRelatedPosts(slug: string, limit = 3): Post[] {
  const current = getPostBySlug(slug);
  if (!current) return [];
  const others = getAllPosts().filter((p) => p.slug !== slug);
  const sameCategory = others.filter((p) => p.category === current.category);
  const rest = others.filter((p) => p.category !== current.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

const TR_CHARS: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u",
};

/**
 * Başlıktan kalıcı anchor id'si üretir (#corek-otunu-etkili-kilan-bilesen-nedir).
 * AI motorları ve kullanıcılar bölüm bazlı derin link verebilsin diye gerekli.
 * toLocaleLowerCase("tr") şart: JS'in varsayılan lowercase'i "I" → "i" yapar,
 * Türkçede "I" → "ı" olmalıdır.
 */
export function headingId(heading: string): string {
  return heading
    .toLocaleLowerCase("tr")
    .replace(/[çğıiöşüâîû]/g, (ch) => TR_CHARS[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Dakika cinsinden okuma süresi (ortalama 200 kelime/dk). */
export function readingMinutes(post: PostSource): number {
  const words = [
    post.keyTakeaway,
    ...post.intro,
    ...post.sections.flatMap((s) => [s.heading, ...s.body, ...(s.list ?? [])]),
    ...post.faqs.flatMap((f) => [f.q, f.a]),
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
