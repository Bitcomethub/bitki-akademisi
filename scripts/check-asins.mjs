#!/usr/bin/env node
/**
 * ASIN CANLILIK DENETÇİSİ — `npm run asin:check`
 *
 * NEDEN VAR?
 * 2026-08-03'te ürün sahibinden 28 ASIN'lik liste geldi; not olarak 2 tanesinin
 * "Piyasaya Arz Öncesi Bildirim" uyum sorunu nedeniyle delisted OLABİLECEĞİ
 * belirtilmişti. Tarama 5 ölü ASIN buldu. Listeye güvenip yalnızca 2'sini
 * elemek, siteye 3 kırık ürün linki koyardı.
 *
 * Kırık ürün linki, bu sitenin en pahalı hatasıdır: okuyucu bir sağlık
 * içeriğine güvenip tıklıyor ve Amazon'un "Sayfa Bulunamadı" ekranına düşüyor.
 * Uydurma bir cümleden farkı yok — ikisi de güveni bir kerede harcıyor.
 *
 * NEDEN GÜNLÜK İŞ AKIŞINA BAĞLI DEĞİL?
 * Bilerek MANUEL. GitHub runner'ları veri merkezi IP'lerinden çıkar ve Amazon
 * bunları dönemsel olarak engeller/CAPTCHA'ya düşürür. CI'da koşsaydı, engellenen
 * bir istek "ürün öldü" gibi görünür ve doğru linkleri aramaya düşürürdü —
 * yani kapının yanlış pozitifi, bu kez para yolunda. Ayrıca günlük yazının
 * Amazon'un erişilebilirliğine bağlanması, motoru dış servise rehin verir.
 *
 * KULLANIM
 *   npm run asin:check            → hepsini tara
 *   npm run asin:check -- --live  → yalnızca 'asin' alanı olanları tara
 * Çıkış kodu: ölü ASIN varsa 1 (bilinçli — insan bakmalı).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const facts = JSON.parse(readFileSync(join(root, "content/brand-facts.json"), "utf8"));

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const liveOnly = process.argv.includes("--live");

/** Kontrol edilecek her kayıt: nereden geldiği ve beklenen durumu ile. */
function targets() {
  const out = [];
  for (const p of facts.products) {
    if (p.asin) out.push({ label: p.name, asin: p.asin, expectLive: true });
  }
  for (const f of facts.natExt) {
    if (f.asin) out.push({ label: f.code, asin: f.asin, expectLive: true });
    else if (f.asinDelisted && !liveOnly)
      out.push({ label: f.code, asin: f.asinDelisted, expectLive: false });
  }
  return out;
}

async function probe(asin) {
  try {
    const res = await fetch(`https://www.amazon.com.tr/dp/${asin}`, {
      headers: { "User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9" },
      redirect: "follow",
    });
    const html = res.ok ? await res.text() : "";
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/ : Amazon\.com\.tr.*$/, "");
    // CAPTCHA, 200 döner ama ürün sayfası DEĞİLDİR. Bunu "canlı" saymak,
    // engellenmiş bir isteği doğrulama sanmak olur.
    const blocked = /captcha|Bot Kontrol|automated access/i.test(html);
    return { status: res.status, title, blocked };
  } catch (err) {
    return { status: 0, title: `(ağ hatası: ${err.message})`, blocked: false };
  }
}

const rows = targets();
console.log(`${rows.length} ASIN taranıyor (amazon.com.tr)...\n`);

let dead = 0;
let blocked = 0;
let revived = 0;

for (const t of rows) {
  const r = await probe(t.asin);
  const live = r.status === 200 && !r.blocked;

  let mark;
  if (r.blocked) {
    mark = "ENGEL";
    blocked++;
  } else if (live && t.expectLive) {
    mark = "OK   ";
  } else if (live && !t.expectLive) {
    mark = "DİRİL"; // delisted sanılan ürün yeniden yayında
    revived++;
  } else if (!live && t.expectLive) {
    mark = "ÖLÜ  ";
    dead++;
  } else {
    mark = "ölü✓ "; // beklendiği gibi ölü
  }

  console.log(
    `${mark} ${t.asin}  ${String(r.status).padEnd(3)}  ${t.label.padEnd(34)} ${r.title.slice(0, 46)}`
  );
}

console.log("");
if (blocked) {
  console.log(
    `${blocked} istek CAPTCHA/engel döndü. SONUÇ GÜVENİLİR DEĞİL — ` +
      "başka bir ağdan tekrar çalıştır. Engellenen istek 'ölü' sayılmadı."
  );
}
if (revived) {
  console.log(
    `${revived} ürün yeniden yayında. brand-facts.json'da 'asinDelisted' → 'asin' olarak taşı.`
  );
}
if (dead) {
  console.log(
    `${dead} CANLI SANILAN ASIN ÖLÜ. brand-facts.json'da 'asin' → 'asinDelisted' olarak taşı; ` +
      "link kendiliğinden aramaya düşer."
  );
  process.exit(1);
}
console.log("Canlı beklenen tüm ASIN'ler erişilebilir.");
