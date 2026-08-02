#!/usr/bin/env node
/**
 * content/blog-topic-backlog.json üreticisi.
 *
 * NEDEN SCRIPT? Backlog 120+ konu içeriyor ve her konu 7 alanlı. Elle yazılmış
 * bir JSON'da yeni bitki eklemek 4 blok kopyalamak demek; burada tek satır.
 * Ayrıca arketip şablonları tek yerde durduğu için başlık/slug tutarlılığı
 * garanti — 120 konuda elle tutarlılık kaybolur.
 *
 * KÜMELEME MANTIĞI (anahtar kelime kanibalizasyonunu önler)
 * Bir küme = bir sayfa. Türkçe SERP'te şunlar AYNI kümedir, tek sayfa olur:
 *   "X nedir" ≈ "X faydaları" ≈ "X ne işe yarar" ≈ "X neye iyi gelir"
 * Şunlar ise AYRI SERP, ayrı sayfa:
 *   "X nasıl kullanılır" / "X günde ne kadar" / "X ne zaman içilir"
 *   "X kimler kullanmamalı" / "X yan etkileri" / "X zararları"
 * Dördüncü arketip her bitkiye özgü, elle yazılmış ayırt edici bir açı.
 *
 * MARKA GÜVENLİĞİ
 * Bileşimi brand-facts.json'da DOĞRULANMAYAN ürünler (XP Tonis, Phyto Sist,
 * İmmubowel, Purpol, İmmu Life 8, Osmanlı Kök Şurubu, Momoroid) için bitki
 * yazısı ÜRETİLMEZ — içeriklerini bilmiyoruz, uydurmak yasak. Bunlar yerine
 * kategori düzeyinde (ekstrakt nedir, etiket nasıl okunur…) yazılar var.
 * NAT-EXT farklı: içerikleri fiyat listesinden doğrulandı, yazılabilir.
 *
 * Çalıştır: node scripts/build-topic-backlog.mjs
 */
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brandFacts = JSON.parse(readFileSync(join(root, "content/brand-facts.json"), "utf8"));

/**
 * [brand-facts plant, görünen ad, slug tabanı, kategori, talep katmanı]
 * Talep katmanı 1 = Türkiye'de en çok aranan/bilinen, 3 = niş.
 * Gerçek arama hacmi verisi yok (API bağlı değil); katman bilinirlik ve
 * mevcut ürün çeşitliliği üzerinden atandı — tahmin olduğu açıkça beyan edilir.
 */
const PLANTS = [
  ["Zerdeçal", "Zerdeçal", "zerdecal", "Eklem & İltihap", 1],
  ["Çörek Otu", "Çörek Otu", "corek-otu", "Bağışıklık", 1],
  ["Zencefil", "Zencefil", "zencefil", "Sindirim & Karaciğer", 1],
  ["Ekinezya", "Ekinezya", "ekinezya", "Bağışıklık", 1],
  ["Zeytin Yaprağı", "Zeytin Yaprağı", "zeytin-yapragi", "Kalp & Dolaşım", 1],
  ["Alıç", "Alıç Meyvesi", "alic", "Kalp & Dolaşım", 1],
  ["Ginkgo Biloba", "Ginkgo Biloba", "ginkgo-biloba", "Zihin & Odaklanma", 1],
  ["Isırgan", "Isırgan Otu", "isirgan-otu", "Saç & Cilt", 1],
  ["Deve Dikeni", "Deve Dikeni", "deve-dikeni", "Sindirim & Karaciğer", 1],
  ["Sarı Kantaron", "Sarı Kantaron", "sari-kantaron", "Uyku & Sakinlik", 1],
  ["Ginseng", "Ginseng", "ginseng", "Enerji & Dayanıklılık", 2],
  ["Meyan Kökü", "Meyan Kökü", "meyan-koku", "Sindirim & Karaciğer", 2],
  ["Hayıt Meyvesi", "Hayıt Meyvesi", "hayit-meyvesi", "Kadın Sağlığı", 2],
  ["Biberiye", "Biberiye", "biberiye", "Zihin & Odaklanma", 2],
  ["Gilaburu", "Gilaburu", "gilaburu", "Böbrek & İdrar Yolları", 2],
  ["Yaban Mersini", "Yaban Mersini", "yaban-mersini", "Göz Sağlığı", 2],
  ["Enginar Yaprağı", "Enginar Yaprağı", "enginar-yapragi", "Sindirim & Karaciğer", 2],
  ["Reishi Mantarı", "Reishi Mantarı", "reishi-mantari", "Bağışıklık", 2],
  ["Kudret Narı", "Kudret Narı", "kudret-nari", "Metabolizma & Kilo", 2],
  ["Siyah Üzüm Çekirdeği", "Üzüm Çekirdeği", "uzum-cekirdegi", "Kalp & Dolaşım", 2],
  ["Keçiboynuzu", "Keçiboynuzu", "keciboynuzu", "Enerji & Dayanıklılık", 2],
  ["Karabaş Otu", "Karabaş Otu", "karabas-otu", "Uyku & Sakinlik", 3],
  ["Civanperçemi", "Civanperçemi", "civanpercemi", "Kadın Sağlığı", 3],
  ["Hindiba Yaprağı", "Hindiba", "hindiba", "Sindirim & Karaciğer", 3],
  ["Kırkkilit", "Kırkkilit Otu", "kirkkilit-otu", "Eklem & İltihap", 3],
  ["Damar Otu", "Damar Otu", "damar-otu", "Solunum", 3],
  ["Aynı Safa", "Aynısafa", "aynisafa", "Saç & Cilt", 3],
  ["Kenevir Tohumu", "Kenevir Tohumu Yağı", "kenevir-tohumu-yagi", "Saç & Cilt", 3],
];

/** Arketip şablonları. `n` = görünen ad, `s` = slug tabanı. */
const ARCHETYPES = [
  {
    key: "fayda",
    slug: (s) => `${s}-faydalari-nelerdir`,
    title: (n) => `${n} Faydaları Nelerdir? Bilinenler ve Bilinmeyenler`,
    question: (n) => `${n} faydaları nelerdir?`,
    keywords: (n, s) => [
      `${n.toLocaleLowerCase("tr")} faydaları`,
      `${n.toLocaleLowerCase("tr")} nedir`,
      `${n.toLocaleLowerCase("tr")} ne işe yarar`,
      `${n.toLocaleLowerCase("tr")} neye iyi gelir`,
      `${s.replace(/-/g, " ")} ekstraktı`,
    ],
    angle:
      "Bitkinin ne olduğu, hangi bileşenlerinin öne çıktığı ve hangi alanlarda " +
      "araştırıldığı. KULLANIM MİKTARI ve GÜVENLİK detayına GİRME — onlar ayrı " +
      "yazıların konusu; burada yalnızca kısa birer cümleyle değinip ilgili " +
      "yazıya bırak.",
  },
  {
    key: "kullanim",
    slug: (s) => `${s}-nasil-kullanilir`,
    title: (n) => `${n} Nasıl Kullanılır? Günlük Miktar ve Zamanlama`,
    question: (n) => `${n} nasıl kullanılır?`,
    keywords: (n) => {
      const l = n.toLocaleLowerCase("tr");
      return [
        `${l} nasıl kullanılır`,
        `${l} günde ne kadar`,
        `${l} ne zaman içilir`,
        `${l} kaç gün kullanılır`,
        `${l} aç karnına`,
      ];
    },
    angle:
      "Form form (çay, ekstrakt, damla, kapsül, yağ) miktar ve zamanlama; kür " +
      "süresi; aç/tok karın; saklama. FAYDA anlatımına GİRME, o ayrı yazının " +
      "konusu. Kesin doz verme — 'ürün etiketindeki miktar esastır' çerçevesi kur.",
  },
  {
    key: "guvenlik",
    slug: (s) => `${s}-kimler-kullanmamali`,
    title: (n) => `${n} Kimler Kullanmamalı? Yan Etkiler ve İlaç Etkileşimleri`,
    question: (n) => `${n} kimler tarafından kullanılmamalı?`,
    keywords: (n) => {
      const l = n.toLocaleLowerCase("tr");
      return [
        `${l} kimler kullanmamalı`,
        `${l} yan etkileri`,
        `${l} zararları`,
        `${l} hamilelikte kullanımı`,
        `${l} ilaç etkileşimi`,
      ];
    },
    angle:
      "Kontrendikasyonlar, bildirilen yan etkiler, ilaç etkileşimleri, gebelik/" +
      "emzirme, çocuk, ameliyat öncesi. Korkutma dili KULLANMA; 'hekime danışın' " +
      "çerçevesini her bölümde koru. Fayda anlatımına girme.",
  },
];

/**
 * Bitkiye özgü dördüncü yazı. Üçlü şablonun kapsamadığı, ayrı SERP'i olan
 * gerçek sorular — tarif, isim karışıklığı, tür farkı, hedef kitle.
 */
const EXTRAS = {
  zerdecal: {
    slug: "zerdecal-sutu-altin-sut-nasil-yapilir",
    title: "Zerdeçal Sütü (Altın Süt) Nasıl Yapılır? Tarif ve Ölçüler",
    question: "Zerdeçal sütü nasıl yapılır?",
    keywords: ["altın süt tarifi", "zerdeçal sütü", "zerdeçal sütü nasıl yapılır", "golden milk"],
    angle: "Tarif odaklı: ölçüler, karabiber ve yağ neden eklenir, ne zaman içilir.",
  },
  "corek-otu": {
    slug: "corek-otu-bali-nasil-yapilir",
    title: "Çörek Otu Balı Nasıl Yapılır? Oran, Saklama ve Kullanım",
    question: "Çörek otu balı nasıl yapılır?",
    keywords: ["çörek otu balı", "çörek otu bal karışımı", "çörek otu balı tarifi"],
    angle: "Tarif odaklı: tohum/bal oranı, öğütmek gerekir mi, saklama koşulları.",
  },
  zencefil: {
    slug: "zencefil-cayi-nasil-yapilir",
    title: "Zencefil Çayı Nasıl Yapılır? Bal ve Limonla Doğru Ölçü",
    question: "Zencefil çayı nasıl yapılır?",
    keywords: ["zencefil çayı tarifi", "zencefil çayı nasıl yapılır", "zencefil limon bal"],
    angle: "Tarif odaklı: taze/kuru zencefil ölçüsü, demleme süresi, bal ne zaman eklenir.",
  },
  ekinezya: {
    slug: "ekinezya-mi-kara-murver-mi",
    title: "Ekinezya mı Kara Mürver mi? Kış Desteğinde Aradaki Fark",
    question: "Ekinezya ile kara mürver arasındaki fark nedir?",
    keywords: ["ekinezya mı kara mürver mi", "kara mürver ekinezya farkı", "kış bitkileri"],
    angle: "Karşılaştırma: iki bitkinin bileşenleri, kullanım süreleri ve kimin hangisini tercih ettiği.",
  },
  "zeytin-yapragi": {
    slug: "zeytin-yapragi-cayi-nasil-demlenir",
    title: "Zeytin Yaprağı Çayı Nasıl Demlenir? Acılığı Azaltma Yöntemleri",
    question: "Zeytin yaprağı çayı nasıl demlenir?",
    keywords: ["zeytin yaprağı çayı", "zeytin yaprağı nasıl demlenir", "zeytin yaprağı çayı acı"],
    angle: "Tarif odaklı: demleme süresi/sıcaklığı, acılığın kaynağı (oleuropein) ve azaltma yolları.",
  },
  alic: {
    slug: "alic-cayi-nasil-yapilir",
    title: "Alıç Çayı Nasıl Yapılır? Meyve, Yaprak ve Çiçek Farkı",
    question: "Alıç çayı nasıl yapılır?",
    keywords: ["alıç çayı", "alıç çayı nasıl yapılır", "alıç yaprağı çayı", "alıç demleme"],
    angle: "Tarif odaklı: kurutulmuş meyve/yaprak/çiçek ölçüleri ve hangisinin ne zaman kullanıldığı.",
  },
  "ginkgo-biloba": {
    slug: "ginkgo-biloba-standardize-ekstrakt-ne-demek",
    title: "Ginkgo Biloba'da Standardize Ekstrakt Ne Demek?",
    question: "Ginkgo biloba ekstraktında standardizasyon ne anlama gelir?",
    keywords: ["ginkgo biloba standardize", "ginkgo ekstrakt oranı", "flavon glikozit"],
    angle: "Standardizasyon kavramı: etiketteki yüzdeler ne anlatır, iki ürün neden farklıdır.",
  },
  "isirgan-otu": {
    slug: "isirgan-otu-sac-dokulmesi-icin-nasil-kullanilir",
    title: "Isırgan Otu Saç Dökülmesi İçin Nasıl Kullanılır?",
    question: "Isırgan otu saç dökülmesine karşı nasıl kullanılır?",
    keywords: ["ısırgan otu saç", "ısırgan otu saç dökülmesi", "ısırgan otu şampuanı", "ısırgan suyu saça"],
    angle: "Hedef kitle odaklı: harici (suyu, yağı) ve dahili kullanım ayrımı, gerçekçi beklenti.",
  },
  "deve-dikeni": {
    slug: "deve-dikeni-silimarin-nedir",
    title: "Deve Dikeni ve Silimarin İlişkisi Nedir?",
    question: "Silimarin nedir ve deve dikeniyle ilişkisi nedir?",
    keywords: ["silimarin nedir", "deve dikeni silimarin", "silymarin", "deve dikeni ekstraktı oranı"],
    angle: "Bitki ile aktif bileşen ayrımı — zerdeçal/curcumin yazısının kardeşi; etiketteki silimarin oranı.",
  },
  "sari-kantaron": {
    slug: "sari-kantaron-yagi-nasil-yapilir",
    title: "Sarı Kantaron Yağı Nasıl Yapılır? Geleneksel Yöntem",
    question: "Sarı kantaron yağı nasıl yapılır?",
    keywords: ["sarı kantaron yağı", "kantaron yağı nasıl yapılır", "kantaron yağı tarifi"],
    angle: "Geleneksel maserasyon yöntemi, güneşte bekletme, saklama. Fotosensitivite uyarısı şart.",
  },
  ginseng: {
    slug: "kore-ginsengi-mi-sibirya-ginsengi-mi",
    title: "Kore Ginsengi mi Sibirya Ginsengi mi? Türler Arasındaki Fark",
    question: "Kore ginsengi ile Sibirya ginsengi arasındaki fark nedir?",
    keywords: ["kore ginsengi", "sibirya ginsengi", "panax ginseng", "ginseng türleri", "kırmızı ginseng"],
    angle: "Tür karşılaştırması: Panax ginseng, Panax quinquefolius, Eleutherococcus — botanik olarak aynı değil.",
  },
  "meyan-koku": {
    slug: "meyan-koku-serbeti-nasil-yapilir",
    title: "Meyan Kökü Şerbeti Nasıl Yapılır? Geleneksel Tarif",
    question: "Meyan kökü şerbeti nasıl yapılır?",
    keywords: ["meyan şerbeti", "meyan kökü şerbeti tarifi", "meyan balı", "meyan kökü nasıl yapılır"],
    angle: "Tarif odaklı: soğuk demleme, köpük, bekletme süresi. Tansiyon uyarısı mutlaka yer alsın.",
  },
  "hayit-meyvesi": {
    slug: "hayit-meyvesi-ne-kadar-surede-etki-eder",
    title: "Hayıt Meyvesi Ne Kadar Sürede Etki Eder?",
    question: "Hayıt meyvesi kullanımında etki ne kadar sürede beklenir?",
    keywords: ["hayıt meyvesi ne kadar sürede etki eder", "hayıt kaç ay kullanılır", "vitex agnus castus süre"],
    angle: "Zaman beklentisi odaklı: döngüsel kullanım mantığı, neden kısa sürede sonuç beklenmediği.",
  },
  biberiye: {
    slug: "biberiye-suyu-saca-nasil-uygulanir",
    title: "Biberiye Suyu Saça Nasıl Uygulanır?",
    question: "Biberiye suyu saça nasıl uygulanır?",
    keywords: ["biberiye suyu saç", "biberiye suyu nasıl yapılır", "biberiye saç toniği"],
    angle: "Uygulama odaklı: kaynatma/demleme, durulanır mı, sıklık, alerji testi.",
  },
  gilaburu: {
    slug: "gilaburu-suyu-nasil-yapilir",
    title: "Gilaburu Suyu Nasıl Yapılır? Kayseri Usulü ve Ölçüler",
    question: "Gilaburu suyu nasıl yapılır?",
    keywords: ["gilaburu suyu", "gilaburu nasıl yapılır", "gilaburu suyu tarifi", "kayseri gilaburu"],
    angle: "Tarif ve yerel gelenek odaklı: bekletme süresi, ekşiliğin sebebi, günlük tüketim ölçüsü.",
  },
  "yaban-mersini": {
    slug: "yaban-mersini-ile-blueberry-ayni-mi",
    title: "Yaban Mersini ile Blueberry Aynı Meyve mi?",
    question: "Yaban mersini ile blueberry aynı meyve midir?",
    keywords: ["yaban mersini blueberry farkı", "yaban mersini nedir", "bilberry blueberry", "çay üzümü"],
    angle: "İsim karışıklığı odaklı: Vaccinium myrtillus ile Vaccinium corymbosum ayrımı, antosiyanin farkı.",
  },
  "enginar-yapragi": {
    slug: "enginar-yapragi-ekstrakti-ile-enginar-yemek-farki",
    title: "Enginar Yaprağı Ekstraktı ile Enginar Yemenin Farkı Nedir?",
    question: "Enginar yaprağı ekstraktı ile enginar yemek arasındaki fark nedir?",
    keywords: ["enginar yaprağı ekstraktı", "enginar yaprağı nedir", "sinarin", "enginar özü"],
    angle: "Gıda ile takviye ayrımı: yenen kısım ile ekstrakte edilen kısım aynı değil.",
  },
  "reishi-mantari": {
    slug: "reishi-ile-chaga-arasindaki-fark",
    title: "Reishi ile Chaga Arasındaki Fark Nedir?",
    question: "Reishi mantarı ile chaga arasındaki fark nedir?",
    keywords: ["reishi chaga farkı", "chaga mantarı", "ganoderma lucidum", "şifalı mantarlar"],
    angle: "Karşılaştırma: iki mantarın botanik farkı, kullanım biçimleri, hazırlama yöntemi.",
  },
  "kudret-nari": {
    slug: "kudret-nari-nasil-yenir",
    title: "Kudret Narı Nasıl Yenir? Acılığını Azaltmanın Yolları",
    question: "Kudret narı nasıl yenir?",
    keywords: ["kudret narı nasıl yenir", "kudret narı acılığı", "kudret narı yemeği", "kudret narı balı"],
    angle: "Mutfak odaklı: tuzlama, haşlama, çekirdek ayıklama; kan şekeri ilacı uyarısı kısa ama net.",
  },
  "uzum-cekirdegi": {
    slug: "uzum-cekirdegi-ekstrakti-ile-resveratrol-ayni-mi",
    title: "Üzüm Çekirdeği Ekstraktı ile Resveratrol Aynı Şey mi?",
    question: "Üzüm çekirdeği ekstraktı ile resveratrol aynı madde midir?",
    keywords: ["üzüm çekirdeği resveratrol", "opc nedir", "proantosiyanidin", "resveratrol nedir"],
    angle: "Bileşen ayrımı: OPC/proantosiyanidin çekirdekte, resveratrol kabukta — aynı şey değil.",
  },
  keciboynuzu: {
    slug: "keciboynuzu-pekmezi-ile-ekstrakti-farki",
    title: "Keçiboynuzu Pekmezi ile Ekstraktı Arasındaki Fark Nedir?",
    question: "Keçiboynuzu pekmezi ile keçiboynuzu ekstraktı arasındaki fark nedir?",
    keywords: ["keçiboynuzu pekmezi", "harnup pekmezi", "keçiboynuzu ekstraktı", "keçiboynuzu şekeri"],
    angle: "Form karşılaştırması: pekmezin şeker yoğunluğu ile ekstraktın farkı, kimin hangisini seçtiği.",
  },
  "karabas-otu": {
    slug: "karabas-otu-ile-lavanta-ayni-mi",
    title: "Karabaş Otu ile Lavanta Aynı Bitki mi?",
    question: "Karabaş otu ile lavanta aynı bitki midir?",
    keywords: ["karabaş otu lavanta farkı", "lavandula stoechas", "karabaş otu nedir", "yalancı lavanta"],
    angle: "İsim karışıklığı: Lavandula stoechas ile Lavandula angustifolia ayrımı, koku ve kullanım farkı.",
  },
  civanpercemi: {
    slug: "civanpercemi-cayi-adet-doneminde-nasil-kullanilir",
    title: "Civanperçemi Çayı Adet Döneminde Nasıl Kullanılır?",
    question: "Civanperçemi çayı adet döneminde nasıl kullanılır?",
    keywords: ["civanperçemi adet", "civanperçemi çayı", "achillea millefolium", "civanperçemi kadın"],
    angle: "Hedef kitle odaklı: geleneksel kullanım, zamanlama, gebelikte kullanılmaması uyarısı belirgin.",
  },
  hindiba: {
    slug: "hindiba-kahvesi-nedir",
    title: "Hindiba Kahvesi Nedir? Kafeinsiz Alternatif Olarak Hindiba",
    question: "Hindiba kahvesi nedir?",
    keywords: ["hindiba kahvesi", "hindiba kökü", "kafeinsiz kahve alternatifi", "chicory coffee"],
    angle: "Alternatif ürün odaklı: kavrulmuş kök, tat profili, inülin içeriği, kimler sevmez.",
  },
  "kirkkilit-otu": {
    slug: "kirkkilit-otu-nerede-yetisir",
    title: "Kırkkilit Otu Nerede Yetişir, Nasıl Tanınır?",
    question: "Kırkkilit otu nerede yetişir ve nasıl tanınır?",
    keywords: ["kırkkilit otu nedir", "kırkkilit otu nerede yetişir", "kırkkilit otu tanıma"],
    angle: "Botanik/toplama odaklı: yetişme alanı, hangi kısmı kullanılır, benzer bitkilerle karışması.",
  },
  "damar-otu": {
    slug: "damar-otu-ile-sinir-otu-ayni-mi",
    title: "Damar Otu ile Sinir Otu Aynı Bitki mi?",
    question: "Damar otu ile sinir otu aynı bitki midir?",
    keywords: ["damar otu sinir otu", "plantago lanceolata", "damar otu nedir", "sinir otu nedir"],
    angle: "İsim karışıklığı: yöresel adlandırmalar, Plantago türleri, hangi ad hangi bitkiye ait.",
  },
  aynisafa: {
    slug: "aynisafa-ile-papatya-arasindaki-fark",
    title: "Aynısafa ile Papatya Arasındaki Fark Nedir?",
    question: "Aynısafa ile papatya arasındaki fark nedir?",
    keywords: ["aynısafa nedir", "calendula nedir", "aynısafa papatya farkı", "portakal nergisi"],
    angle: "İsim/görünüm karışıklığı: Calendula officinalis ile Matricaria chamomilla ayrımı, kullanım alanları.",
  },
  "kenevir-tohumu-yagi": {
    slug: "kenevir-tohumu-yagi-ile-cbd-ayni-mi",
    title: "Kenevir Tohumu Yağı ile CBD Yağı Aynı Şey mi?",
    question: "Kenevir tohumu yağı ile CBD yağı aynı ürün müdür?",
    keywords: ["kenevir tohumu yağı", "cbd yağı farkı", "hemp seed oil", "kenevir yağı nedir"],
    angle:
      "Ürün karışıklığı: tohumdan sıkılan yağ ile çiçek/yapraktan elde edilen ekstrakt farklı ürünlerdir. " +
      "Türkiye'deki yasal çerçeveye dair İDDİA ÜRETME, yalnızca ikisinin farklı ürün olduğunu açıkla.",
  },
};

/** Bitkiden bağımsız, kategori düzeyinde yazılar — bileşimi bilinmeyen
 *  karışım ürünlerinin yerini bunlar tutar (uydurma yerine gerçek fayda). */
const GENERAL = [
  {
    slug: "bitkisel-sivi-ekstrakt-nedir",
    title: "Bitkisel Sıvı Ekstrakt Nedir? Çay ve Kapsülden Farkı",
    question: "Bitkisel sıvı ekstrakt nedir?",
    category: "Genel Bilgi",
    keywords: ["bitkisel sıvı ekstrakt", "ekstrakt nedir", "tentür nedir", "sıvı bitki ekstraktı"],
    angle: "Üretim yöntemi, çözücü, konsantrasyon; çay/kapsül/damla ile karşılaştırma.",
  },
  {
    slug: "standardize-ekstrakt-ne-demek",
    title: "Bitkisel Takviyede 'Standardize' Ne Anlama Gelir?",
    question: "Standardize bitkisel ekstrakt ne demektir?",
    category: "Genel Bilgi",
    keywords: ["standardize ekstrakt", "standardizasyon nedir", "ekstrakt oranı", "1:4 ekstrakt"],
    angle: "Etiketteki oranların (1:4, %5 vb.) anlamı; neden iki aynı isimli ürün farklı olabilir.",
  },
  {
    slug: "bitkisel-takviye-etiketi-nasil-okunur",
    title: "Bitkisel Takviye Etiketi Nasıl Okunur?",
    question: "Bitkisel takviye etiketi nasıl okunur?",
    category: "Genel Bilgi",
    keywords: ["takviye etiketi okuma", "gıda takviyesi etiket", "bitkisel ürün etiketi"],
    angle: "Latince ad, kullanılan bitki kısmı, ekstrakt oranı, günlük miktar, uyarılar.",
  },
  {
    slug: "bitkisel-takviyeler-hangi-ilaclarla-etkilesir",
    title: "Bitkisel Takviyeler Hangi İlaçlarla Etkileşir? Genel Rehber",
    question: "Bitkisel takviyeler hangi ilaçlarla etkileşebilir?",
    category: "Genel Bilgi",
    keywords: ["bitki ilaç etkileşimi", "bitkisel takviye ilaç", "kan sulandırıcı bitki"],
    angle: "Etkileşim sınıfları (kan sulandırıcı, antidepresan, tansiyon, şeker); hekime ne söylenmeli.",
  },
  {
    slug: "bitkisel-takviyede-kur-mantigi",
    title: "Bitkisel Takviyede Kür Mantığı: Ne Kadar Süre Kullanılmalı?",
    question: "Bitkisel takviyeler ne kadar süre kullanılmalıdır?",
    category: "Genel Bilgi",
    keywords: ["bitkisel kür süresi", "takviye ne kadar kullanılır", "kür arası"],
    angle: "Neden sürekli kullanım önerilmez, kür/ara mantığı, hangi bitkiler kısa süreliktir.",
  },
  {
    slug: "gebelikte-bitkisel-takviye",
    title: "Gebelikte Bitkisel Takviye Kullanılır mı?",
    question: "Gebelikte bitkisel takviye kullanılabilir mi?",
    category: "Genel Bilgi",
    keywords: ["gebelikte bitkisel çay", "hamilelikte takviye", "emzirirken bitkisel ürün"],
    angle: "Baharat miktarı ile takviye dozu ayrımı; veri yetersizliği kavramı; hekim onayı çerçevesi.",
  },
  {
    slug: "cocuklarda-bitkisel-takviye",
    title: "Çocuklarda Bitkisel Takviye Kullanımı: Neye Dikkat Edilmeli?",
    question: "Çocuklarda bitkisel takviye kullanılabilir mi?",
    category: "Genel Bilgi",
    keywords: ["çocukta bitkisel takviye", "çocuk ekinezya", "alkolsüz bitkisel damla"],
    angle: "Yaş sınırları, alkol bazlı ekstrakt sorunu, miktar ölçekleme yanlışı, çocuk hekimi vurgusu.",
  },
  {
    slug: "ameliyat-oncesi-bitkisel-takviye",
    title: "Ameliyat Öncesi Bitkisel Takviye Ne Zaman Bırakılmalı?",
    question: "Ameliyat öncesi bitkisel takviyeler ne zaman bırakılmalıdır?",
    category: "Genel Bilgi",
    keywords: ["ameliyat öncesi bitkisel", "cerrahi bitkisel takviye", "kanama riski bitki"],
    angle: "Neden bırakılır, tipik süre çerçevesi, anesteziste ne söylenmeli.",
  },
  {
    slug: "soguk-sikim-bitkisel-yaglar-nasil-saklanir",
    title: "Soğuk Sıkım Bitkisel Yağlar Nasıl Saklanır?",
    question: "Soğuk sıkım bitkisel yağlar nasıl saklanmalıdır?",
    category: "Genel Bilgi",
    keywords: ["soğuk sıkım yağ saklama", "bitkisel yağ bozulur mu", "koyu şişe yağ"],
    angle: "Işık/ısı/oksijen, koyu cam, buzdolabı gerekir mi, acılaşma nasıl anlaşılır.",
  },
  {
    slug: "gmp-ve-haccp-sertifikasi-ne-anlama-gelir",
    title: "GMP ve HACCP Sertifikaları Bitkisel Üründe Ne Anlama Gelir?",
    question: "GMP ve HACCP sertifikaları bitkisel üründe ne anlama gelir?",
    category: "Genel Bilgi",
    keywords: ["gmp sertifikası nedir", "haccp nedir", "bitkisel ürün kalite belgesi"],
    angle: "İki sistemin ne denetlediği, neyi garanti ETMEDİĞİ, tüketici için pratik anlamı.",
  },
  {
    slug: "coklu-bitki-formulleri-tek-bitkiden-etkili-mi",
    title: "Çoklu Bitki Formülleri Tek Bitkiden Daha mı Etkili?",
    question: "Çoklu bitki içeren formüller tek bitkiden daha mı etkilidir?",
    category: "Genel Bilgi",
    keywords: ["çoklu bitki formülü", "bitki karışımı takviye", "sinerji bitkisel"],
    angle: "Sinerji iddiasının sınırları, doz seyrelmesi riski, ne zaman karışım mantıklı.",
  },
  {
    slug: "bitkisel-cay-mi-ekstrakt-mi",
    title: "Bitkisel Çay mı Ekstrakt mı? Hangisi Ne Zaman Tercih Edilir",
    question: "Bitkisel çay mı ekstrakt mı tercih edilmelidir?",
    category: "Genel Bilgi",
    keywords: ["bitkisel çay mı ekstrakt mı", "çay ekstrakt farkı", "demleme konsantrasyon"],
    angle: "Tutarlılık, konsantrasyon, maliyet, ritüel değeri; hangi durumda hangisi.",
  },
];

/**
 * NAT-EXT formülleri — içerikleri brand-facts.json'da DOĞRULANMIŞ olduğu için
 * yazılabilir. Konu formülün kendisi değil, bitkilerin BİRLİKTE kullanımıdır.
 */
const NAT_EXT_TOPICS = [
  { code: "NE/04", slug: "corek-otu-zeytin-yapragi-kudret-nari-birlikte", category: "Bağışıklık" },
  { code: "NE/06", slug: "ekinezya-ginseng-reishi-yaban-mersini-birlikte", category: "Bağışıklık" },
  { code: "NE/09", slug: "deve-dikeni-enginar-hindiba-birlikte", category: "Sindirim & Karaciğer" },
  { code: "NE/10", slug: "hayit-civanpercemi-biberiye-birlikte", category: "Kadın Sağlığı" },
  { code: "NE/08", slug: "isirgan-kirkkilit-yaki-otu-birlikte", category: "Eklem & İltihap" },
  { code: "NE/11", slug: "coban-cokerten-karabas-damar-otu-zencefil-birlikte", category: "Böbrek & İdrar Yolları" },
];

/**
 * seed-posts.json'daki yazıların HANGİ KÜMEYİ doldurduğu.
 *
 * Slug eşleşmesi yetmez: "ekinezya-nedir-ne-ise-yarar" slug olarak
 * "ekinezya-faydalari-nelerdir"e benzemez ama AYNI SERP kümesini hedefler —
 * ikisini birden yayımlamak kanibalizasyondur. Bu yüzden kapsama küme
 * düzeyinde işaretlenir, slug düzeyinde değil.
 *
 * "zerdecal-curcumin-farki-nedir" burada YOK: o yazı bitki-bileşen ayrımını
 * anlatır, "zerdeçal faydaları" sorgusunu hedeflemez — farklı küme, kalabilir.
 */
const COVERED = {
  "corek-otu": { fayda: "corek-otu-faydalari-nelerdir" },
  ekinezya: { fayda: "ekinezya-nedir-ne-ise-yarar" },
};

// ---------------------------------------------------------------------------

const topics = [];

for (const [plant, noun, slugBase, category, tier] of PLANTS) {
  for (const arch of ARCHETYPES) {
    if (COVERED[slugBase]?.[arch.key]) continue;
    topics.push({
      slug: arch.slug(slugBase),
      title: arch.title(noun),
      question: arch.question(noun),
      plant,
      category,
      archetype: arch.key,
      tier,
      keywords: arch.keywords(noun, slugBase),
      angle: arch.angle,
    });
  }
  const extra = EXTRAS[slugBase];
  if (extra) {
    topics.push({ ...extra, plant, category, archetype: "ozel", tier });
  }
}

for (const t of NAT_EXT_TOPICS) {
  const formula = brandFacts.natExt.find((f) => f.code === t.code);
  if (!formula) throw new Error(`brand-facts.json'da ${t.code} yok`);
  const list = formula.contents;
  const human = list.slice(0, -1).join(", ") + " ve " + list[list.length - 1];
  topics.push({
    slug: t.slug,
    title: `${human} Neden Birlikte Kullanılır?`,
    question: `${human} birlikte kullanıldığında ne amaçlanır?`,
    plant: null,
    category: t.category,
    archetype: "kombinasyon",
    tier: 3,
    keywords: list.map((p) => `${p.toLocaleLowerCase("tr")} karışımı`).concat("bitki karışımı"),
    angle:
      `Bu bitkilerin (${list.join(", ")}) tek tek ne için kullanıldığı ve bir arada ` +
      `neden tercih edildikleri. Formülün İmmu-Nat ${formula.code} ürününde yer aldığı ` +
      `bilgisi doğrudur ama yazının konusu ÜRÜN DEĞİL, bitkilerin birlikteliğidir. ` +
      `Formüle ait doz, oran veya etki İDDİASI ÜRETME — bunlar bilinmiyor.`,
  });
}

for (const g of GENERAL) {
  topics.push({ ...g, plant: null, archetype: "genel", tier: 2 });
}

/**
 * SIRALAMA: önce talep katmanı, sonra bitki (derinlik), sonra arketip.
 * Derinlik-öncelikli bilinçli bir tercih: AI motorlarında atıf almak için
 * 30 bitkide birer yazı olmaktansa 8 bitkide dörder yazı olmak daha güçlü
 * bir konu otoritesi sinyali — ilgili yazılar birbirine iç link verir.
 */
const ARCH_ORDER = { fayda: 0, kullanim: 1, guvenlik: 2, ozel: 3, kombinasyon: 4, genel: 5 };
const plantOrder = new Map(PLANTS.map(([p], i) => [p, i]));

topics.sort((a, b) => {
  if (a.tier !== b.tier) return a.tier - b.tier;
  const ap = a.plant ? plantOrder.get(a.plant) : 999;
  const bp = b.plant ? plantOrder.get(b.plant) : 999;
  if (ap !== bp) return ap - bp;
  return ARCH_ORDER[a.archetype] - ARCH_ORDER[b.archetype];
});

// Çakışma kontrolü — aynı slug iki kez üretilirse pipeline sonsuza kadar
// aynı konuyu seçmeye çalışır.
const seen = new Set();
for (const t of topics) {
  if (seen.has(t.slug)) throw new Error(`Tekrar eden slug: ${t.slug}`);
  seen.add(t.slug);
  // Slug'lar URL'e girdiği için ASCII olmalı. Türkçe karakter kaçarsa
  // kanonik URL punycode'lanır ve şemadaki URL sayfanınkiyle uyuşmaz.
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.slug)) {
    throw new Error(`ASCII olmayan / bozuk slug: ${t.slug}`);
  }
}

// Yayımlanmış makalelerle çakışma — backlog'da zaten yazılmış konu olmamalı.
const published = new Set(
  JSON.parse(readFileSync(join(root, "content/seed-posts.json"), "utf8")).posts.map((p) => p.slug)
);
const collisions = topics.filter((t) => published.has(t.slug));
if (collisions.length) {
  throw new Error(`Yayımlanmış slug backlog'da: ${collisions.map((t) => t.slug).join(", ")}`);
}

const output = {
  _readme: [
    "OTOMATİK ÜRETİLİR — bu dosyayı elle düzenleme.",
    "Kaynak: scripts/build-topic-backlog.mjs  ·  Çalıştır: node scripts/build-topic-backlog.mjs",
    "",
    "Bir küme = bir sayfa. Arketipler (fayda / kullanim / guvenlik / ozel)",
    "Türkçe SERP'te AYRI sonuç kümeleridir; bu yüzden kanibalizasyon oluşmaz.",
    "Her konudaki `angle` alanı üretim script'ine 'bu yazının DIŞINDA kalan",
    "konular' talimatını verir — asıl kanibalizasyon koruması odur.",
    "",
    "Sıralama derinlik-önceliklidir: yüksek talepli bitkinin dört yazısı",
    "arka arkaya gelir. 30 bitkide birer yazı olmaktansa 8 bitkide dörder",
    "yazı olmak AI motorlarında daha güçlü konu otoritesi sinyalidir.",
    "",
    "Yayımlanmış konular BURADA İŞARETLENMEZ. Pipeline 'yapıldı' bilgisini",
    "seed-posts.json + generated-posts.json'daki slug'lardan TÜRETİR; böylece",
    "bu dosya değişmez kalır ve günlük commit'lerde çakışma üretmez.",
  ],
  _method: {
    clustering: "searchfit-seo:keyword-clustering — bir küme bir sayfa",
    archetypes: {
      fayda: "'X nedir' + 'X faydaları' + 'X ne işe yarar' aynı SERP → tek sayfa (hub)",
      kullanim: "'X nasıl kullanılır' + 'günde ne kadar' + 'ne zaman' → ayrı SERP",
      guvenlik: "'X kimler kullanmamalı' + 'yan etkileri' + 'hamilelikte' → ayrı SERP",
      ozel: "Bitkiye özgü tarif / isim karışıklığı / tür farkı — elle seçilmiş",
      kombinasyon: "NAT-EXT formüllerindeki bitkilerin birlikteliği (içerik doğrulanmış)",
      genel: "Bitkiden bağımsız kategori yazıları",
    },
    tierNote:
      "Talep katmanı TAHMİNDİR — arama hacmi API'si bağlı değil. Bilinirlik ve " +
      "ürün çeşitliliği üzerinden atandı, gerçek veri geldiğinde güncellenmeli.",
    excluded:
      "Bileşimi doğrulanmayan karışım ürünleri (XP Tonis, Phyto Sist, İmmubowel, " +
      "Purpol, İmmu Life 8, Osmanlı Kök Şurubu, Momoroid) için konu ÜRETİLMEDİ — " +
      "içeriklerini bilmiyoruz ve uydurmak yasak. Yerlerini 'genel' yazıları tutar.",
  },
  _stats: {
    total: topics.length,
    plants: PLANTS.length,
    byArchetype: Object.fromEntries(
      Object.keys(ARCH_ORDER).map((k) => [k, topics.filter((t) => t.archetype === k).length])
    ),
    byTier: Object.fromEntries(
      [1, 2, 3].map((n) => [n, topics.filter((t) => t.tier === n).length])
    ),
  },
  topics,
};

const outPath = join(root, "content/blog-topic-backlog.json");
writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(`${topics.length} konu yazıldı → content/blog-topic-backlog.json`);
console.log(JSON.stringify(output._stats, null, 2));
