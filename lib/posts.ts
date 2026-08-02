export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
  amazonUrl?: string;
  content: string; // simple HTML/markdown-ish string, rendered as-is
};

export const posts: Post[] = [
  {
    slug: "corek-otu-faydalari-nelerdir",
    title: "Çörek Otu Faydaları Nelerdir? Bilimsel Bakış ve Kullanım Rehberi",
    excerpt:
      "Çörek otu (Nigella sativa) binlerce yıldır kullanılan bir şifa kaynağı. Bağışıklık, sindirim ve cilt sağlığına etkilerini, doğru kullanım şeklini ve dikkat edilmesi gerekenleri bu rehberde topladık.",
    date: "2026-08-02",
    category: "Bağışıklık",
    image: "/images/corek-otu.jpg",
    content: `
      <p>Çörek otu (Nigella sativa), Orta Doğu ve Akdeniz mutfaklarında ve geleneksel tıpta yüzyıllardır kullanılan küçük siyah tohumlardır. İçerdiği <strong>timokinon</strong> bileşiği sayesinde güçlü antioksidan ve anti-inflamatuar etkileriyle bilinir.</p>
      <h2>Başlıca Faydaları</h2>
      <ul>
        <li><strong>Bağışıklık desteği:</strong> Timokinon içeriği sayesinde bağışıklık sistemini destekleyici etkileri araştırmalarda incelenmiştir.</li>
        <li><strong>Sindirim sistemi:</strong> Geleneksel kullanımda mide rahatsızlıklarını hafifletmek için tercih edilir.</li>
        <li><strong>Cilt sağlığı:</strong> Antioksidan özelliği sayesinde cilt bakımında da kullanılır.</li>
      </ul>
      <h2>Nasıl Kullanılır?</h2>
      <p>Çörek otu ekstraktı genellikle kapsül formunda, günlük önerilen dozla tüketilir. Ham tohum olarak da bal veya yoğurtla karıştırılarak alınabilir.</p>
      <h2>Dikkat Edilmesi Gerekenler</h2>
      <p>Hamilelik ve emzirme döneminde, ayrıca kan sulandırıcı ilaç kullananların doktoruna danışması önerilir.</p>
      <p><em>Bu içerik bilgilendirme amaçlıdır, tıbbi tavsiye yerine geçmez.</em></p>
    `,
    amazonUrl: "https://www.amazon.com.tr/s?k=immu-nat+%C3%A7%C3%B6rek+otu",
  },
  {
    slug: "ekinezya-nedir-ne-ise-yarar",
    title: "Ekinezya Nedir, Ne İşe Yarar? Soğuk Algınlığında Neden Tercih Edilir",
    excerpt:
      "Kış aylarının vazgeçilmez bitkisi ekinezya, bağışıklık sistemini destekleyen etkileriyle öne çıkıyor. Ekinezyanın faydalarını, kullanım şeklini ve bilimsel bulguları inceledik.",
    date: "2026-08-01",
    category: "Bağışıklık",
    image: "/images/ekinezya.jpg",
    content: `
      <p>Ekinezya (Echinacea), Kuzey Amerika kökenli bir bitki olup özellikle soğuk algınlığı ve grip mevsiminde bağışıklık desteği için tercih edilir.</p>
      <h2>Ekinezyanın Etkileri</h2>
      <p>Yapılan çalışmalarda ekinezya ekstraktının üst solunum yolu enfeksiyonlarının süresini ve şiddetini azaltabileceği gösterilmiştir.</p>
      <h2>Kimler Kullanabilir?</h2>
      <p>Genel olarak sağlıklı yetişkinler kısa süreli kürler halinde kullanabilir. Otoimmün hastalığı olanların doktora danışması önemlidir.</p>
      <p><em>Bu içerik bilgilendirme amaçlıdır, tıbbi tavsiye yerine geçmez.</em></p>
    `,
    amazonUrl: "https://www.amazon.com.tr/s?k=immu-nat+ekinezya",
  },
  {
    slug: "zerdecal-curcumin-farki-nedir",
    title: "Zerdeçal ve Curcumin Farkı Nedir? Hangisini Seçmelisiniz?",
    excerpt:
      "Zerdeçal (zerdeçal kökü) ve içindeki aktif madde curcumin sıkça karıştırılıyor. İkisi arasındaki farkı, biyoyararlanım konusunu ve doğru seçim kriterlerini anlatıyoruz.",
    date: "2026-07-30",
    category: "Eklem & İltihap",
    image: "/images/zerdecal.jpg",
    content: `
      <p>Zerdeçal, curcumin adlı aktif bileşeni içeren bir kök baharatıdır. Curcumin, zerdeçalın içindeki asıl etkili maddedir ancak tek başına vücut tarafından zor emilir.</p>
      <h2>Biyoyararlanım Neden Önemli?</h2>
      <p>Piperin (karabiber ekstraktı) ile birlikte alınan curcumin formülasyonları, emilim oranını önemli ölçüde artırabilir.</p>
      <h2>Hangisini Seçmeli?</h2>
      <p>Genel destek için zerdeçal ekstraktı, hedefe yönelik yüksek doz destek için standardize curcumin (örn. Curcumin-p53 tarzı formülasyonlar) tercih edilebilir.</p>
      <p><em>Bu içerik bilgilendirme amaçlıdır, tıbbi tavsiye yerine geçmez.</em></p>
    `,
    amazonUrl: "https://www.amazon.com.tr/s?k=immu-nat+zerdecal",
  },
];

export function getPostBySlug(slug: string) {
  return posts.find((p) => p.slug === slug);
}

export function getAllPosts() {
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
}
