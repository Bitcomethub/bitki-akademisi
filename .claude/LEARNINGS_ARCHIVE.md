# Learnings — Arşiv

Bu dosya OTOMATİK YÜKLENMEZ. Yalnızca semptomu buradaki bir başlığa benzeyen
bir sorunu ayıklarken açılır. Kalıcı kurallar `LEARNINGS.md`'de (12k karakter).

---

## 2026-10-11 — IndexNow ping'i haftalarca sessizce hiç koşmadı
- **Problem:** Günlük blog hattı her sabah yayına giriyordu ama Bing/Yandex'e tek bir ping gitmiyordu. Hiçbir yerde kırmızı düşmedi, hiçbir uyarı yoktu — yalnızca ping yoktu.
- **Eliminated:** "Bing/IndexNow tarafı sorunlu, istek gidiyor ama kabul edilmiyor" — yok; adım HİÇ çalışmadı, log'da adımın tamamen atlandığı görülüyor. "Anahtarı Actions secret'ında tutmak daha güvenli" — yanlış varsayım: IndexNow anahtarı protokol gereği zaten `public/<key>.txt` olarak PUBLIC yayımlanmak zorunda, gizli bir değer değil. Secret ikinci bir kopya demek, ve iki kopya ayrıştığı gün 403 gelir.
- **Chosen:** Anahtarı YAYIMLANAN `public/<key>.txt` dosyasından okuyan `scripts/indexnow.mjs`; workflow koşulu secret'ın varlığına değil, dosyanın varlığına bağlı. Ping'i `key` alanı ile `keyLocation` içeriğinin birebir aynı olmasını IndexNow şart koşuyor — tek kaynak, tek doğru.
- **Evidence:** `gh secret list --repo Bitcomethub/bitki-akademisi` → `INDEXNOW_KEY` YOK (yalnızca ANTHROPIC_API_KEY, FAL_KEY). Adımın koşulu `env.INDEXNOW_KEY != ''` olduğu için her sabah sessizce atlandı. Düzeltmeden sonra canlı ping kodları: miamigezi 200, floridarehberi 200, miamiendeksi 202.
- **Rule:** Bir CI adımını "secret tanımlıysa koş" diye kapılamak, o secret hiç eklenmediğinde adımı sonsuza kadar sessizce öldürür — kapıyı kimlik bilgisinin varlığına değil, doğrulanabilir ARTEFAKTA bağla.

## 2026-10-11 — `git pull --rebase` çöktü, depo "her şey silinmiş" gibi göründü
- **Problem:** `git push` reddedildi (uzak ilerlemişti, 3 blog commit'i gelmişti) → `git pull --rebase` yarıda çöktü. Sonrasında `git status` her dosyayı AYNI ANDA hem "staged deleted" hem "untracked" gösterdi; HEAD detached kaldı. Görüntü: 199 dosyalık çalışma ağacı git'e göre yok hükmünde.
- **Eliminated:** "iCloud dosyaları sildi, içerik gitti" — yok; `find` 199 dosyayı yerinde gösterdi ve `refs/heads/main` commit'i (1d78b9c) duruyordu. "`git checkout -f main` ile zorla geç" — index yokken untracked görünen dosyaları ezer, hangi dosyanın ezileceği belirsiz. "Yeniden klonla" — gereksiz; uzak (`origin/main`) zaten sağlamdı ve commit'ler nesne veritabanında duruyordu.
- **Chosen:** Kök neden `.git/index` dosyasının HİÇ OLMAMASIYDI — rebase index'i yazarken ölmüş, `.git/index.lock` (8445 bayt) yetim kalmış. Sıra: `rm -f .git/index.lock` → `git reset --mixed` (index'i HEAD'den yeniden kurar, çalışma ağacına dokunmaz) → `git checkout main` → `git merge origin/main` → `git push`.
- **Evidence:** `.git/` listesinde `index.lock` VAR, `index` YOK. Onarım sonrası `git status` tek satıra indi (`M AGENTS.md`), 5 yeni dosya yerinde, 3 blog commit'i merge'de korundu, push `21725b6..4733380`.
- **Rule:** `git status`'ta aynı dosyalar hem silinmiş hem untracked görünüyorsa bu içerik kaybı DEĞİL, index kaybıdır — önce `ls .git/index` bak; yoksa `index.lock`'ı sil ve `git reset --mixed` ile index'i yeniden kur, depoyu yeniden klonlama.

## 2026-10-11 — Sitemap'in tamamını günlük bildirmek: seçilen ve elenen
- **Problem:** IndexNow ping'i günlük içerik hattına bağlanacaktı. Sitemap 38 URL; "hepsini her gün bildir" en basit okunuştu.
- **Eliminated:** "Her gün tüm sitemap'i bildir" — çalışır ama IndexNow sözleşmesi ("yeni ya da DEĞİŞEN URL bildir") dışına çıkar; her gün değişmeyen 38 URL göndermek protokolü gürültüye çevirir. "Hiç gönderme, motor kendi bulsun" — bildirimin tüm faydasını siler.
- **Chosen:** Script'in VARSAYILANI sitemap (tam süpürme, elle/backfill için), ama günlük hat `post_url` + `/blog` gibi DAR bir listeyle çağırıyor. `--wait-for-key` ile sabit `sleep` yerine anahtar dosyasının yayına girmesi bekleniyor.
- **Evidence:** `node scripts/indexnow.mjs` (sitemap, 47 URL) → HTTP 200; workflow içindeki dar liste hâlâ aynı isteği atıyor ama yalnız yeni sayfayı bildiriyor.
- **Rule:** Bir "toplu bildirim" aracının varsayılanı toplu olabilir; onu ZAMANLANMIŞ bir işe bağlarken dar listeye indir — sıklık ile kapsam çarpılır.

## 2026-08-02 — GitHub Actions: adımın `if:` ifadesi kendi `env` bloğunu görmez
- **Problem:** `if: env.FAL_KEY != ''` koşulu, aynı adımın `env:` bloğunda tanımlı `FAL_KEY` için her zaman false döndü; adım sessizce atlandı.
- **Kök neden:** `if:` ifadesi adım env'i BAĞLANMADAN önce değerlendirilir. İş (job) düzeyindeki env görünür, adım düzeyindeki görünmez.
- **Elenen:** `secrets.FAL_KEY`'i doğrudan `if:` içinde kullanmak — secret ifadesi log'a sızma riski ve yine boş/dolu ayrımı yapmıyor; env'i iş düzeyine taşımak — sır tüm adımlara açılır, gereksiz yüzey.
- **Seçilen:** Kontrolü shell'e al: `if [ -z "$FAL_KEY" ]; then echo "::warning::..."; exit 0; fi`. Hem çalışıyor hem eksikliği log'a UYARI olarak yazıyor.
- **Kanıt:** İş akışı `js-yaml` ile ayrıştırılarak doğrulandı; adım sırası (görsel üretimi → doğrulama build'i) teyit edildi.
- **Rule:** Actions'ta bir adımın kendi `env`'ine `if:` içinde güvenme. Koşullu atlamayı shell'e taşı ve **her zaman bir uyarı bas** — sessizce atlanan adım, aylar sonra "neden çalışmamış?" sorusuna dönüşür.

## 2026-08-02 — FLUX'ta "no X" yazmak X'i sahneye çağırıyor
- **Problem:** Kapak görseli prompt'una "no capsules, no supplement bottles" eklendi; üretilen görsellerde kapsüller ve takviye şişeleri belirdi.
- **Kök neden:** FLUX negatif prompt DESTEKLEMEZ (Stable Diffusion'dan farkı). Metnin tamamı pozitif koşullandırmadır; "no capsules" yazmak modele "capsules" token'ını verir.
- **Elenen:** Ayrı `negative_prompt` parametresi — API'de yok, sessizce yok sayılıyor; yasak nesneyi hiç anmamak — sahne boşluğu kaldığında model boşluğu kendi klişesiyle (ürün fotoğrafı) dolduruyor.
- **Seçilen:** Yasak yerine sahneyi TAM tarif et: bitkinin doğal ortamı, ışık, kompozisyon, malzeme — modele başka bir şey koyacak yer bırakma.
- **Kanıt:** Yeniden üretilen 3 seed kapağında (çörek otu, ekinezya, zerdeçal) kapsül/şişe yok; önizlemede `/_next/image` optimizasyonundan 200 image/jpeg 38 KB dönüyor.
- **Rule:** FLUX ailesinde istemediğini YAZMA, istediğini eksiksiz yaz. Bir modelin negatif prompt desteklediğini varsaymadan önce API şemasını doğrula — desteklemeyen modelde yasak listesi, davetiyeye dönüşür.

## 2026-08-02 — Yerel build kırık (AMFI) — doğrulama yine de yapılmalı
- **Problem:** Bu Mac'te `npm run build` çalışmıyor (native binary kısıtı: lightningcss/SWC engelleniyor). Değişikliğin derlenip derlenmediği yerelde bilinemiyor.
- **Elenen:** "Vercel'de görürüz" deyip push etmek — her hata için bir deploy döngüsü, kırık commit repoya girer; native modülleri zorlamak — makine düzeyinde güvenlik kısıtı, çözülecek bir şey değil.
- **Seçilen:** İki katmanlı yerel doğrulama: `npx tsc --noEmit` + `npx eslint` (native gerektirmez) ve içerik/render tarafı için WASM tabanlı harness; nihai doğrulama Vercel'in Linux runner'ında. CI'da da build commit'ten ÖNCE koşuyor.
- **Kanıt:** Yığındaki 6 dalın 8 deploy'u da READY; en tepedeki commit (78dbf3f) dahil.
- **Rule:** Yerel build kırıksa doğrulamayı bırakma, native gerektirmeyen katmana indir (tsc + lint + WASM) ve derleme doğrulamasını CI'da commit'ten ÖNCE konumlandır.

## 2026-08-02 — Vercel Cron günlük içerik motorunu çalıştıramaz
- **Problem:** Günlük makale üretimi doğal olarak Vercel Cron'a benziyor (site zaten Vercel'de), ama iş üretilen makaleyi dosyaya YAZIP commit etmek zorunda.
- **Elenen:** Vercel Cron + function — function dosya sistemi salt okunur ve deploy'a commit atamaz; yazı bir sonraki deploy'da kaybolur. Cron + harici veritabanı — build anında türetilen `sitemap.xml`/`llms.txt` içeriği göremez, ek altyapı maliyeti.
- **Seçilen:** GitHub Actions. `checkout` gerçek bir çalışma dizini verir; commit + push Vercel build'ini tetikler, sitemap ve llms.txt kendiliğinden güncellenir.
- **Kanıt:** İş akışı sırası bilinçli — kapı testleri → üretim → **gerçek build (commit'ten ÖNCE)** → commit → IndexNow → fail en sonda. Bozuk JSON repoya giremiyor; reddedilen taslak inceleme için yine de commit'leniyor.
- **Rule:** Zamanlanmış iş depoya dosya yazacaksa Actions kullan, Vercel Cron değil. Kararı "hangi platformdayız" değil, "iş yazma yapıyor mu" belirler. (2026-09-28'de site Railway'e taşındı; hosting bağlamı değişti, kural aynı kaldı.)

