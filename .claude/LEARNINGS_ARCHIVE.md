# Learnings Archive (Historical / Resolved Cases)

This file holds the full historical incident write-ups split out of `.claude/LEARNINGS.md` on 2026-08-03 to keep the auto-loaded file small and prevent future re-bloat. One-off bugs/incidents that are already fixed and unlikely to recur in the same form go here, kept as reference for when a similar symptom appears again. This file is NOT auto-loaded at session start; consult it only when debugging a similar recurring issue.

For still-binding operating rules, see `.claude/LEARNINGS.md`.

---

Below: the 11 original entries verbatim, as written 2026-08-02 – 2026-08-03.
The compact `LEARNINGS.md` carries the standing RULE distilled from each of
these; this file carries the investigation behind it — what was tried, what
was ruled out and why, and what evidence closed it. When a symptom here looks
familiar, the ruled-out options are usually the most valuable part.

---

## 2026-08-19 — CSS katmanı hiç doğrulanmıyordu; tsc de eslint de ona bakmıyor
- **Problem:** Yerel build AMFI yüzünden kırık olduğu için doğrulama `tsc --noEmit` + `eslint`'e indirilmişti. Bu ikisi CSS'e HİÇ bakmaz. Tailwind v4 tanımadığı bir utility'yi (yanlış yazılmış `@theme` anahtarı, üretilmeyen bir sınıf) hata vermeden ATLAR — sayfa varsayılan boyutta render olur, hiçbir gate ötmez. Tip sistemi eklerken bu kör nokta doğrudan yolun üstündeydi.
- **Eliminated:** `@tailwindcss/cli` ile derlemek → lightningcss'e bağlı, AMFI'de aynı duvara çarpıyor. · PostCSS üzerinden koşmak → `@tailwindcss/postcss` de lightningcss yüklüyor. · "Vercel build'i beklerim" → doğru ama geri bildirim döngüsü commit+push başına ~2 dk; token/zaman israfı ve yanlış varsayımla push etmeyi teşvik ediyor.
- **Chosen:** `tailwindcss`'in saf-JS `compile()` API'si (`node_modules/tailwindcss/dist/lib.mjs`). lightningcss'e hiç dokunmuyor; yalnızca minify/optimize katmanı native. `scripts/check-css.mjs` globals.css'i gerçekten derleyip çıktıda token'ları arıyor.
- **Evidence:** `npm run css:check` → "25 kontrolün tamamı geçti (43037 bayt CSS derlendi)". Karşı-kanıt: ilk yazımda kontrol regex'lerinin 5'i kırmızı yandı, çünkü Tailwind utility'yi `font-size: var(--text-h1)` diye üretiyor, literal `clamp()` gömmüyor — yani harness gerçekten çıktıya bakıyor, "geçti" demiyor.
- **Rule:** Bir doğrulama katmanı eklerken "hangi dosya türü hiçbir gate'ten geçmiyor" diye sor. `tsc` TypeScript'e, `eslint` JS'e bakar; CSS/şablon/JSON hiçbirine görünmez. Sessizce atlanan bir utility, hata veren bir utility'den tehlikelidir.

## 2026-08-19 — `ch` ölçüsü, font'la AYNI kuralda tanımlanmazsa sessizce yanlışlanır
- **Problem:** Satır uzunluğunu `max-width: 68ch` ile kapatmak istedim. `ch`, kullanıldığı elemanın KENDİ `font-size`/`font-family`'sine göre çözülür — kalıtıma değil. Ölçüyü bir sarmalayıcıya, okuma fontunu başka bir yere koyarsan 68ch bambaşka bir piksel değeri olur ve kimse fark etmez, çünkü sayfa yine "makul" görünür.
- **Eliminated:** Sabit `max-w-2xl` (672px) → font değişince ölçü sessizce yanlışlanır, `ch`'in tek avantajı buydu. · `--measure`'ı yalnız `:root`'ta tanımlayıp her yerde kullanmak → `var()` token olarak yerine konur ama değer KULLANILDIĞI elemanda hesaplanır; yanlış fontlu bir elemanda kullanılırsa yanlış çıkar, üstelik CSS geçerli olduğu için hata da vermez.
- **Chosen:** `.reading-column` tek kuralda üçünü birden tutuyor: `font-family`, `font-size` ve `width: min(100% - 2*var(--gutter), var(--measure))`. Ayrılmaları imkânsız. `padding` yerine `min()` kalıbı: border-box ile çakışmıyor.
- **Evidence:** Canlı deploy CSS'inde `.reading-column{font-family:var(--font-serif);font-size:var(--text-body);...width:min(100% - 2*var(--gutter),var(--measure))}` ve `:root{--measure:68ch}` birlikte doğrulandı.
- **Rule:** Font'a bağlı bir birim (`ch`, `ex`, `em`) kullanan kural, o fontu da kendisi tanımlamalı. Birimi tanımlayan yer ile fontu tanımlayan yer ayrılırsa bağ yalnızca kafada kalır, kodda kalmaz.

## 2026-08-19 — Yerel doğrulama 9-50 dakika sürüyor: AMFI değil, iCloud I/O
- **Problem:** `tsc --noEmit` 8dk52sn sürdü; `eslint` 50+ dakikada bitmedi; `npm run build` 10 dakikada banner'ı bile geçemedi. AMFI notu zaten vardı ama bu farklı bir şey: süreçler ÇÖKMÜYOR, bekliyor.
- **Eliminated:** "AMFI native binary'yi engelliyor" → tek başına açıklamıyor; AMFI engellese süreç hızla HATA verirdi, 9 dakika beklemezdi. · "Proje büyük" → 8 sayfa, 5 lib dosyası; tsc'nin işi saniyeler sürmeli.
- **Chosen:** Teşhis `time` çıktısından geldi: `4.50s user 1.76s system 1% cpu 8:52.29 total`. %1 CPU + 9 dakika duvar saati = hesaplama değil, I/O bekleme. Depo `~/Desktop` altında ve bu Mac'te Desktop iCloud-senkron; dosyalar dematerialize edilmiş, her okuma indirme tetikliyor. Aynı commit Vercel'in Linux runner'ında **7 saniyede** build oldu.
- **Evidence:** `time node ./node_modules/typescript/bin/tsc --noEmit` → `1% cpu 8:52.29 total`, çıktı 0 satır, exit 0. Vercel build log: "✓ Compiled successfully in 1595ms … Build Completed in /vercel/output [7s]".
- **Rule:** Bir komut yavaşsa ÖNCE `time` ile CPU yüzdesine bak. Düşük CPU + uzun duvar saati asla "ağır iş" değildir; I/O ya da ağ beklemesidir. Bu makinede Desktop altındaki depolarda yerel tam-proje taramaları (eslint/build) pratik değil — dosya-kapsamlı çalıştır ya da doğrudan CI'a bırak.

## 2026-08-03 — Ürün sahibinden gelen ASIN listesinde bildirilenden 3 fazla ölü link vardı
- **Problem:** Sahibi 28 ASIN'lik listeyi verirken 2 ürünün ("Piyasaya Arz Öncesi Bildirim" uyum sorunu) delisted OLABİLECEĞİNİ bildirdi. Liste doğrudan `/dp/` linkine çevrilecekti; kırık ürün linki bu sitede uydurma cümleyle aynı maliyettedir — okuyucu sağlık içeriğine güvenip tıklar, Amazon'un 404'üne düşer.
- **Kök neden:** Liste envanter/barkod sisteminden geliyor, Amazon yayın durumundan değil. İkisi ayrı gerçeklik; SKU'nun var olması listelemenin canlı olduğunu göstermez.
- **Elenen:** Bildirilen 2'yi elemek — tarama NE/01, NE/03, NE/09'un da 404 verdiğini gösterdi, yani 3 kırık link yayımlanacaktı; ölü ASIN'leri tamamen silmek — ürün yeniden yayına alındığında sıfırdan aranması gerekirdi; `asin` + `durum` bayrağı tutmak — bayrağı okumayı unutan her yeni tüketici ölü linki yayımlar.
- **Seçilen:** 28'inin tamamını canlı tara (iki tur, `/dp/` + `/gp/product/`, canlı kontrol ASIN'leriyle aynı partide — hız sınırlaması elensin). Ölüleri `asinDelisted` adlı, HİÇBİR KODUN OKUMADIĞI alana taşı: `asin` yokluğu `amazonUrlFor()`'u kendiliğinden aramaya düşürüyor. Güvenlik dallanmadan değil, veri biçiminden geliyor.
- **Kanıt:** `npm run asin:check` → 28 tarandı, 23 canlı (başlıklar İmmu-Nat markasını doğruluyor), 5 ölü, çıkış 0. Preview'da render edilen HTML'de 3 makalenin CTA'sı `href="https://www.amazon.com.tr/dp/B07J39K48R|B07JQV3149|B09SGC6BZJ"`.
- **Rule:** Para yoluna bağlanacak dış veri, kaynağı ne kadar yetkili olursa olsun (ürün sahibi dahil) yayımlanmadan önce hedefinde tek tek doğrulanır; "bunlar bozuk olabilir" notu tam liste sanılmaz. Doğrulanamayan kayıt SİLİNMEZ, kodun okumadığı bir alana taşınır — böylece güvenli davranış varsayılan olur.

## 2026-08-03 — Kapının kırılganlığı hakkında ölçmeden yazdığım yorum yanlış çıktı
- **Problem:** `products[].name`'in çift görevli olduğunu (CTA etiketi + kapının temizlediği kanonik dizgi) görünce, "Curcumin P53" adını Amazon başlığına eşitlemenin yayımlanmış zerdeçal yazısını reddettireceği sonucuna vardım. Gerekçeyi hem `_productsReadme`'ye hem öğrenme kaydına "Ölçtük" diyerek yazdım. Ölçmemiştim; çıkarımdı.
- **Kök neden:** Bir bağın VAR olduğunu görmek (ad gerçekten `canonicalPatterns()`'a giriyor), o bağın TAŞIYICI olduğunu göstermez. "53" iki bağımsız mekanizmayla zaten korunuyordu: kapının negatif lookbehind'ı harfe bitişik rakamı kod sayıp hiç taramıyor, "İmmu Life 8"deki 8 ise `allowedBrandNumbers`'ta. Ad yolu hiç devreye girmiyor.
- **Elenen:** Yorumu olduğu gibi bırakmak — public depoda, gelecek oturumun güveneceği yanlış bir kırılganlık haritası olurdu ve gerçek koruma mekanizmasının üstünü örterdi; adı Amazon başlığına eşitlemek — kapı açısından güvenli ama yayımlanmış yazı ürünü "Curcumin P53 Zerdeçal Ekstraktı" diye anıyor, eşitleme metinle veriyi çelişkiye düşürürdü.
- **Seçilen:** Adı olduğu gibi bırak (gerekçe kapı değil, yayımlanmış metinle tutarlılık), yorumu ÖLÇÜLEN gerçekle değiştir ve kalan gerçek riski yaz: adda tek başına duran, `allowedBrandNumbers`'ta olmayan bir rakam varsa yeniden adlandırma o rakamı açığa çıkarır.
- **Kanıt:** Ad geçici olarak "Curcumin-p53 Zerdeçal Ekstresi" yapılıp `npm run blog:test` çalıştırıldı → kalibrasyon dahil TÜM testler geçti (beklenen: kırılma). Ardından kural regex'i tek tek denendi: `"Curcumin P53 ..."` → eşleşme yok, `"İmmu Life 8 ürünü"` → `8` eşleşiyor ama izinli listede.
- **Rule:** "Ölçtük" kelimesini yalnızca gerçekten çalıştırdığın komuttan sonra yaz. Bir kod yolunun tehlikeli olduğunu iddia etmeden önce o yolu BOZ ve kırıldığını gör; kırılmıyorsa iddian değil, koruma haritan eksiktir.

## 2026-08-02 — Türkçe metinde `\b` kelime sınırı sessizce yanlış eşleşiyor
- **Problem:** Yasaklı ifade taraması "yönleri" kelimesinin içinde "önler" yakaladı; kapı doğru yazılmış makaleyi reddetti ve sebebi log'da "önler" olarak göründüğü için hata regex'te değil içerikte sanıldı.
- **Kök neden:** JS'in `\b` sınırı ASCII tabanlıdır. "ö" kelime karakteri SAYILMAZ, dolayısıyla "y**ö**nleri" içindeki "önler" dizisinin solunda `\b` sağlanır. Sınır çalışmıyor değil — Türkçe harfleri kelime dışı gördüğü için kelime ORTASINDA sınır uyduruyor.
- **Elenen:** `\b` yerine `(^|\s)` — noktalama ("önler,") kaçırır; ekli hâlleri (`önler|önliyor|önleyen`) tek tek listelemek — Türkçe sondan eklemeli, liste asla kapanmaz; Unicode `\p{L}` lookaround — okunmaz ve her kuralda tekrar yazılması gerekir.
- **Seçilen:** Önce `fold()` ile ASCII'ye indir, SONRA `\b` uygula. "yonleri" içinde "onler"in solunda "y" var, ikisi de kelime karakteri, sınır doğru biçimde sağlanmıyor. Tek yerde tanımlı, tüm kurallar miras alıyor.
- **Kanıt:** `npm run blog:test` — yayımlanmış 3 makale (kalibrasyon) geçiyor, 19 sabotaj senaryosunun 19'u doğru sonuç veriyor; bunların 4'ü bilerek eklenmiş yanlış-pozitif kontrolü ("önler mi?" sorusu, ihtimal kipi, ambalaj hacmi, tireli kodlar).
- **Rule:** Türkçe metinde regex eşleştirmesi yapan HER kural, eşleşmeden önce metni ASCII'ye katlamalıdır. Katlanmamış metinde `\b` kullanmak, sessiz yanlış pozitif üretir.

## 2026-08-02 — Yasak kelime listesine "garanti" eklemek en dürüst cümleyi reddetti
- **Problem:** `bannedHealthClaims`'e "garanti" eklendi; kapı şu cümleyi reddetti: "her demlemede aynı miktarda aktif bileşen aldığınızı **garanti etmez**" — yani yazının okuyucuyu en çok koruyan cümlesini.
- **Kök neden:** Kalıplar alt dizgi olarak aranıyor; "garanti" hem iddiada hem iddianın REDDİNDE geçiyor. Yasak olan kelime değil, kelimenin olumlu çekimi.
- **Elenen:** Olumsuzluk eki için istisna (`garanti(?!.*etmez)`) — "garanti etmediği için" gibi varyantlarda kırılır ve her yeni fiil için yeniden yazılır; kelimeyi listeden tamamen çıkarmak — "garanti eder" gerçek bir mevzuat ihlali, kapıdan geçmemeli.
- **Seçilen:** Yalnızca olumlu çekimleri listelemek ("garanti eder", "garanti edilir", "garanti ediyor", "garantidir"). Liste uzadı ama her öğe tek anlamlı.
- **Kanıt:** Sabotaj testi 17–19 (yanlış pozitif kontrolleri) "garanti etmez" içeren cümleyi geçiriyor, sabotaj testi "garanti eder" cümlesini reddediyor.
- **Rule:** Alt dizgi tabanlı yasak listelerine fiil KÖKÜ yazma, ÇEKİMLENMİŞ olumlu hâli yaz. Bir kelimenin yasaklanması gerekiyorsa, önce o kelimenin geçtiği en dürüst cümleyi yaz ve kapıdan geçtiğini doğrula.

## 2026-08-02 — Kalite kapısının yanlış pozitifi, kaçırdığı sabotajdan daha tehlikeli
- **Problem:** Doz kuralı ("sayı + birim") yayımlanmış 3 makalenin 2'sini reddetti: "250 ml sıvı ekstrakt ve 50 ml damla formları". Bu rakamlar marka künyesinde DOĞRULANMIŞ ambalaj bilgisi.
- **Kök neden:** Doz ile ambalaj aynı sözdizimine sahip. Ayrım birimde: doz mg/damla/kapsül/tablet, ambalaj ml. Kural sözdizimine bakıyordu, anlama değil.
- **Elenen:** Rakamı tamamen serbest bırakmak — "günde 500 mg" tam olarak engellenmesi gereken tıbbi tavsiye; makaleyi düzeltip ambalaj bilgisini silmek — doğru içeriği bozup kuralı korumak, kapıyı içeriğin efendisi yapar.
- **Seçilen:** Doz kuralını ayrı fonksiyona böl; SADECE hacim birimini (ml) VE SADECE `allowedBrandNumbers`'ta doğrulanmış rakamla muaf tut. mg/damla/kapsül hiçbir koşulda muaf değil.
- **Kanıt:** Kapı her çalıştığında yayımlanmış 3 makaleyi kalibrasyon olarak doğruluyor — yeni kural onları kırıyorsa kural yanlıştır, içerik değil. `npm run blog:test` → 3/3 kalibrasyon OK.
- **Rule:** Otomatik içerik kapılarını, üretimdeki DOĞRU içeriğe karşı sürekli kalibre et. Yanlış pozitif sessizdir: kapı her gün iyi içeriği reddeder ve kimse kapının bozuk olduğunu fark etmez.

## 2026-08-02 — Üretici LLM'in uyduramayacağı tek şey: var olmayan bir dosya
- **Problem:** Günlük pipeline'da makaleyi bir LLM yazıyor. Makale JSON'unda `amazonUrl` ve `image` alanları olsaydı, model bunları kendi uydurabilirdi — yanlış bir Amazon linki okuyucuyu BAŞKA SATICININ ürününe götürür (para ve güven kaybı, geri alınamaz).
- **Elenen:** Prompt'ta "URL uydurma" demek — talimat, garanti değil; üretim sonrası URL'i doğrulamak — ağ çağrısı, CI'da kırılgan ve yanlış URL doğru biçimde 200 dönebilir.
- **Seçilen:** **Alanı hiç var etme.** Model yalnızca `plant` (katalogdaki bir bitki adı) verebiliyor; `amazonUrl` ondan TÜRETİLİYOR, katalogda yoksa link hiç oluşmuyor. Kapak görselinin varlığı JSON alanı değil, diskte `existsSync` ile belirleniyor.
- **Kanıt:** Sabotaj testlerinde modelin uydurabileceği alan bulunmadığı için ilgili saldırı sınıfı yapısal olarak imkânsız; ASIN bilinmeyen üründe link arama sayfasına düşüyor (`amazonUrlFor`), asla tahmin edilmiş `/dp/` üretilmiyor.
- **Rule:** Bir LLM'in doldurabileceği alanı yaratma; değeri doğrulanmış girdiden TÜRET. Model metin yazabilir ama dosya var edemez — varlık kontrolünü diske dayandır. Emin olunmayan tanımlayıcı (ASIN, ID, URL) tahmin edilmez, alan boş bırakılır.

## 2026-08-02 — JSON-LD'de olup sayfada olmayan alan, yapılandırılmış veri ihlalidir
- **Problem:** `alternativeHeadline` (makalenin cevapladığı soru) JSON-LD'de yayımlanıyordu ama sayfada hiçbir yerde render edilmiyordu.
- **Kök neden:** Şema elle yazıldığında sayfa metninden bağımsız bir ikinci gerçek kaynağı doğar; ikisi zamanla kaçınılmaz olarak ayrışır.
- **Elenen:** Alanı şemadan silmek — soru answer-first mimarisinin merkezi, silmek bilgi kaybı; "şimdilik kalsın" — Google için gizli içerik, AI motorları için güven kaybı.
- **Seçilen:** Soruyu sayfada görünür kıl (kısa cevap kutusunun başlığı yapıldı) ve makale modelini yapısal veriye çevir (`keyTakeaway`, `sections[]`, `faqs[]`); HTML ve JSON-LD artık aynı kaynağın iki projeksiyonu.
- **Kanıt:** Önizleme HTML'inde `<h1>` öncesi görünür soru + `FAQPage` içindeki her soru sayfada birebir mevcut; SSS şeması HTML blob'undan değil aynı diziden üretiliyor.
- **Rule:** Şemaya yalnızca sayfada GÖRÜNEN veriyi koy ve ikisini tek kaynaktan türet. HTML blob'undan FAQPage şeması türetilemez — bu yüzden içerik modeli baştan yapısal olmalıdır.

## 2026-08-02 — Vercel Cron günlük içerik motorunu çalıştıramaz
- **Problem:** Günlük makale üretimi doğal olarak Vercel Cron'a benziyor (site zaten Vercel'de), ama iş üretilen makaleyi dosyaya YAZIP commit etmek zorunda.
- **Elenen:** Vercel Cron + function — function dosya sistemi salt okunur ve deploy'a commit atamaz; yazı bir sonraki deploy'da kaybolur. Cron + harici veritabanı — build anında türetilen `sitemap.xml`/`llms.txt` içeriği göremez, ek altyapı maliyeti.
- **Seçilen:** GitHub Actions. `checkout` gerçek bir çalışma dizini verir; commit + push Vercel build'ini tetikler, sitemap ve llms.txt kendiliğinden güncellenir.
- **Kanıt:** İş akışı sırası bilinçli — kapı testleri → üretim → **gerçek build (commit'ten ÖNCE)** → commit → IndexNow → fail en sonda. Bozuk JSON repoya giremiyor; reddedilen taslak inceleme için yine de commit'leniyor.
- **Rule:** Zamanlanmış iş depoya dosya yazacaksa Actions kullan, Vercel Cron değil. Kararı "hangi platformdayız" değil, "iş yazma yapıyor mu" belirler.

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
