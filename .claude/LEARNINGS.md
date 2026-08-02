# Learnings

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
