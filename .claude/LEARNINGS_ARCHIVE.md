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

## 2026-08-03 — Ürün sahibinden gelen ASIN listesinde bildirilenden 3 fazla ölü link vardı
- **Problem:** Sahibi 28 ASIN'lik listeyi verirken 2 ürünün ("Piyasaya Arz Öncesi Bildirim" uyum sorunu) delisted OLABİLECEĞİNİ bildirdi. Liste doğrudan `/dp/` linkine çevrilecekti; kırık ürün linki bu sitede uydurma cümleyle aynı maliyettedir — okuyucu sağlık içeriğine güvenip tıklar, Amazon'un 404'üne düşer.
- **Kök neden:** Liste envanter/barkod sisteminden geliyor, Amazon yayın durumundan değil. İkisi ayrı gerçeklik; SKU'nun var olması listelemenin canlı olduğunu göstermez.
- **Elenen:** Bildirilen 2'yi elemek — tarama NE/01, NE/03, NE/09'un da 404 verdiğini gösterdi, yani 3 kırık link yayımlanacaktı; ölü ASIN'leri tamamen silmek — ürün yeniden yayına alındığında sıfırdan aranması gerekirdi; `asin` + `durum` bayrağı tutmak — bayrağı okumayı unutan her yeni tüketici ölü linki yayımlar.
- **Seçilen:** 28'inin tamamını canlı tara (iki tur, `/dp/` + `/gp/product/`, canlı kontrol ASIN'leriyle aynı partide — hız sınırlaması elensin). Ölüleri `asinDelisted` adlı, HİÇBİR KODUN OKUMADIĞI alana taşı: `asin` yokluğu `amazonUrlFor()`'u kendiliğinden aramaya düşürüyor. Güvenlik dallanmadan değil, veri biçiminden geliyor.
- **Kanıt:** `npm run asin:check` → 28 tarandı, 23 canlı (başlıklar İmmu-Nat markasını doğruluyor), 5 ölü, çıkış 0. Preview'da render edilen HTML'de 3 makalenin CTA'sı `href="https://www.amazon.com.tr/dp/B07J39K48R|B07JQV3149|B09SGC6BZJ"`.
- **Rule:** Para yoluna bağlanacak dış veri, kaynağı ne kadar yetkili olursa olsun (ürün sahibi dahil) yayımlanmadan önce hedefinde tek tek doğrulanır; "bunlar bozuk olabilir" notu tam liste sanılmaz. Doğrulanamayan kayıt SİLİNMEZ, kodun okumadığı bir alana taşınır — böylece güvenli davranış varsayılan olur.

## 2026-10-17 — "Günlük motor durdu" sanısı: yerel klon 5 commit bayattı, hat sağlıklıydı
- **Problem:** Kullanıcı "günlük blog motoru 11.10'dan beri tek yazı üretmedi, kuyrukta 97 konu bekliyor" dedi; yerel `git log` son commit'i gerçekten 11.10 gösteriyordu. Görev "duran motoru teşhis et" diye verildi.
- **Root cause:** Teşhis edilecek bir durma YOKTU. Desktop/iCloud kopyası eviction yüzünden bayattı (yerel HEAD d9d074d = 11.10); origin/main çoktan c9ec1b1'e (16.10 içerik dahil) ilerlemişti. `gh run list --workflow=daily-blog-post.yml` 9-16 Ekim arası HER GÜN yeşil; içerik commit'leri `bitki-akademisi-bot <actions@github.com>` adına düşüyordu.
- **Eliminated:** Sanıyı doğru kabul edip motorda arıza aramak — yanlış yeri kazmak, kota/zaman kaybı; yerel `git log`/`git status` ile ikna olmak — o komutlar zaten iCloud yüzünden takılıyor ve bayat veri üretiyordu.
- **Chosen:** Durumu YETKİLİ kaynaktan doğrula: `gh run list` (CI geçmişi) + origin/main commit tarihleri. "İş durdu mu?" sorusunda yerel HEAD'e güvenme; önce uzak/CI durumunu oku, sonra teşhis koy.
- **Evidence:** Ardışık 8 yeşil run (Oct 9-16); son içerik commit'i 16.10 `Sarı Kantaron Nasıl Kullanılır?`; konu kuyruğunda bekleyen `deve-dikeni-nasil-kullanilir`. "Sessizlik" tamamen klon bayatlığıydı.
- **Rule:** "İş durdu" teşhisini yerel çalışma kopyasından DEĞİL, yetkili kaynaktan (CI run geçmişi, origin/main) doğrula. Bayat yerel klon — özellikle iCloud gibi senkron geciktiren bir dizinde — sağlıklı bir hattı ölü gösterir. Kanıt gelmeden motorda arıza arama.

## 2026-10-17 — SERP sınırı KARAKTER ölçülür; kalite kapısını kelimeyle kalibre etmek sessiz borç üretir
- **Problem:** Canlı 43 sayfanın 38'inin `<title>`'ı 60, 8'inin meta description'ı 155 karakteri aşıyordu (Google SERP'te kırpılan kısımlar). Sayfa sayfa elle düzeltmek sürdürülemezdi.
- **Root cause:** Üretici script'in kalite kapısı excerpt'i KELİME aralığıyla ölçüyordu (`[12, 40]` kelime). Türkçe sondan eklemeli: 40 kelime ≈ 250-280 KARAKTER. Kapı yeşil kalırken üretilen her makale SERP sınırını aşıyordu — kapının yanlış ölçeği borcu her gün besliyordu, üstelik sessizce.
- **Eliminated:** 38 sayfayı elle düzeltmek — kök neden (kapının ölçeği) kalır, borç bir sonraki üretimden itibaren yeniden birikir; yalnız render tarafında kırpmak — veri modeli hâlâ sınırsız kalır, OG/JSON-LD alanları aşmaya devam eder.
- **Chosen:** İki katman: (1) üretim eşiğini karaktere çevir (`excerptChars: [100,155]`) ve prompt'u "karakter" diye konuştur; (2) render tarafında `lib/seo.ts metaTitle/metaDescription` son savunma — `<title>` `{absolute:…}` ile şablonu atlayıp ≤60, description ≤155. Aynı commit'te mevcut 8 aşan excerpt backfill ile düzeltildi ki kapı yeşil kalsın.
- **Evidence:** Canlı 43 URL'nin `<title>` ≤60 ve description ≤155 (curl ile ölçüldü); `npm run blog:test` 19/19 sabotaj testi geçti; borç düzeltmesi 8 kayıt (`seed-posts.json` 3 + `generated-posts.json` 5).
- **Rule:** Arama motoruna giden metnin SERP sınırı KARAKTER'dir (title ≤60, description ≤155); kapı da karakter ölçmelidir. Bir eşiği kelimeyle ölçüp çıktıyı karakterle kırpmak = her yayında sessiz borç. Ayrıca `title.template` miras alan bir projede kırpılmış başlığa `{absolute:…}` vermeden şablonu devrede bırakmak, marka ekini tekrar ekleyip sınırı yeniden aşar.

## 2026-10-17 — Yeşil kalan sessiz durma, kırmızı gürültülü durmadan daha tehlikeli
- **Problem:** Günlük blog üreticisi kuyruk boşalınca (`pickTopic()` boş) `status:"empty"` ile **exit 0** dönüyordu; workflow'un son adımı `empty`'yi muaftan sayıyordu. Sonuç: iş YEŞİL görünür, site sessizce yayın durdurur, kimse fark etmez.
- **Eliminated:** `empty` muafiyetini olduğu gibi bırakmak — tasarım gereği yeşil bir durma kanalı; script'e sert exit 1 koyup özeti atlamak — neden bittiği görünmez, ilk bakışta "bugün rastgele kırıldı" sanılır.
- **Chosen:** Beklenen-boş durumu `"stalled"`'a çevir, `GITHUB_STEP_SUMMARY`'ye nedeni yaz (kaç yayımlanmamış konu, kaç ertelenmiş), `exit 1`; workflow'daki `'empty'` muafiyeti kaldırıldı. Yani "kuyruk tükendi" de kırmızı ve açıklamalı.
- **Evidence:** Kuyruk boş bir kopyada `GITHUB_STEP_SUMMARY=/tmp/… node scripts/generate-blog-post.mjs` → EXIT=1 ve özete "⛔ Yayımlanabilir konu yok — üretim durdu / kuyruk tükendi" yazıldı.
- **Rule:** Bir zamanlanmış iş, "yapacak iş yok" ile "hiç çalışmadı"yı aynı (sessiz, yeşil) çıkışa sıkıştırmamalı. Beklenen-boş durum bile GÖRÜNÜR olmalı — özet yaz + kırmızı dön. Sessiz durma, gürültülü durmadan pahalıdır: biri fark edilir, diğeri haftalar sonra "neden hiç yazı gelmemiş?" olur.

