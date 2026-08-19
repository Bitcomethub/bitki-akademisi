/**
 * Native-free Tailwind v4 derleme kontrolü.
 *
 * NEDEN VAR: bu makinede `npm run build` çalışmıyor — AMFI, lightningcss ve
 * SWC gibi native binary'leri engelliyor (bkz. .claude/LEARNINGS.md). Yerel
 * doğrulamanın tamamen düşmemesi için `tsc --noEmit` + `eslint` katmanı
 * kullanılıyordu, ama bu ikisi CSS'e hiç bakmıyor: Tailwind'in `@theme`
 * bloğundaki bir yazım hatası ya da hiç üretilmeyen bir utility ikisinden de
 * sessizce geçer, sonra tarayıcıda biçimsiz metin olarak ortaya çıkar.
 *
 * Tailwind'in saf-JS `compile()` API'si lightningcss'e hiç dokunmuyor; bu
 * script onunla globals.css'i gerçekten derleyip çıktının içinde olması
 * gereken token'ları arıyor. Nihai doğrulama yine CI'daki gerçek build.
 *
 * Kullanım:  npm run css:check          (sessiz, sadece sonuç)
 *            npm run css:check -- out.css   (derlenen CSS'i dosyaya yaz)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(path.join(root, "noop.js"));
const { compile } = await import(
  `file://${path.join(root, "node_modules/tailwindcss/dist/lib.mjs")}`
);

function resolveSheet(id, base) {
  if (id.startsWith(".")) return path.resolve(base, id);
  if (id === "tailwindcss")
    return path.join(root, "node_modules/tailwindcss/index.css");
  const pkg = require_.resolve(`${id}/package.json`);
  const style = JSON.parse(fs.readFileSync(pkg, "utf8")).style ?? "index.css";
  return path.join(path.dirname(pkg), style);
}

const compiler = await compile(
  fs.readFileSync(path.join(root, "app/globals.css"), "utf8"),
  {
    base: path.join(root, "app"),
    loadStylesheet: async (id, base) => {
      const p = resolveSheet(id, base);
      return {
        path: p,
        base: path.dirname(p),
        content: fs.readFileSync(p, "utf8"),
      };
    },
    loadModule: async (id, base) => {
      const p = id.startsWith(".")
        ? path.resolve(base, id)
        : require_.resolve(id);
      const m = await import(`file://${p}`);
      return { path: p, base: path.dirname(p), module: m.default ?? m };
    },
  }
);

// Kaynaktaki her tokeni aday sınıf olarak ver; Tailwind eşleşmeyeni eler.
const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) files.push(p);
  }
}
walk(path.join(root, "app"));
walk(path.join(root, "components"));

const candidates = new Set();
for (const f of files)
  for (const tok of fs.readFileSync(f, "utf8").split(/[\s"'`{}()<>=]+/))
    if (tok && /^[a-z0-9[\]:_\-./%]+$/i.test(tok)) candidates.add(tok);

const css = compiler.build([...candidates]);
const outPath = process.argv[2];
if (outPath) fs.writeFileSync(outPath, css);

/* Her kontrol, kaybolduğunda GÖRÜNÜR bir kırıklık üreten bir şeye bakıyor.
   Yalnızca "derlendi mi" demek yetmez: Tailwind tanımadığı bir utility'yi
   hata vermeden atlar, sayfa da varsayılan boyutta render olur. */
const checks = [
  ["okuma fontu bağlandı", /--font-serif:\s*var\(--font-literata\)/],
  ["arayüz fontu bağlandı", /--font-sans:\s*var\(--font-hanken\)/],
  ["gövde 17px ve SABİT (clamp değil)", /--text-body:\s*1\.0625rem;/],
  ["gövde satır yüksekliği 1.7", /--text-body--line-height:\s*1\.7/],
  ["h1 akışkan", /--text-h1:\s*clamp\(/],
  ["h2 akışkan", /--text-h2:\s*clamp\(/],
  ["etiket harf aralığı 0.08em", /--text-label--letter-spacing:\s*0\.08em/],
  ["ölçü 68ch", /--measure:\s*68ch/],
  ["oluk akışkan", /--gutter:\s*clamp\(/],
  [
    "okuma kolonu ölçüye kapaklı",
    /\.reading-column\s*\{[^}]*min\(100% - 2 \* var\(--gutter\), var\(--measure\)\)/,
  ],
  ["geniş kolon 64rem", /\.wide-column\s*\{[^}]*64rem/],
  ["liste kolonu 46rem", /\.list-column\s*\{[^}]*46rem/],
  ["başlıklarda text-wrap: balance", /text-wrap:\s*balance/],
  ["paragraflarda text-wrap: pretty", /text-wrap:\s*pretty/],
  ["hareket azaltma koruması", /prefers-reduced-motion:\s*reduce/],
  ["klavye odak halkası", /:focus-visible\s*\{[^}]*outline/],
  ["tabular rakamlar", /font-variant-numeric:\s*tabular-nums/],
  ["sahte kalın kapalı", /font-synthesis-weight:\s*none/],
];
for (const step of ["h1", "h2", "h3", "lede", "body", "meta", "label"])
  checks.push([
    `.text-${step} utility üretildi`,
    new RegExp(`\\.text-${step}\\s*\\{[^}]*font-size:\\s*var\\(--text-${step}\\)`),
  ]);

let failed = 0;
for (const [name, re] of checks) {
  const ok = re.test(css);
  if (!ok) failed++;
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}`);
}
console.log(
  failed
    ? `\n${failed}/${checks.length} kontrol BAŞARISIZ (${css.length} bayt CSS derlendi)`
    : `\n${checks.length} kontrolün tamamı geçti (${css.length} bayt CSS derlendi)`
);
process.exit(failed ? 1 : 0);
