import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";
import { site } from "@/lib/brand-facts";
import { coverUrl, SITE_COVER_SLUG } from "@/lib/cover";

/**
 * Sitemap posts'tan türetilir — günlük pipeline yeni makaleyi
 * content/generated-posts.json'a eklediğinde burası kendiliğinden büyür.
 * Elle güncelleme gerekmez.
 *
 * NEDEN images ALANI ŞART?
 * Kapak PNG'leri sayfada <img> olarak KULLANILMIYOR (sayfa içi şerit saf CSS —
 * gerekçesi components/cover-band.tsx'te). Yani tarayıcı HTML'de o dosyaya
 * giden hiçbir bağlantı görmüyor; normal keşif yolu kapalı. Geriye üç kanal
 * kalıyor: JSON-LD Article.image, og:image ve sitemap'in image uzantısı.
 * İlk ikisi "bu sayfanın temsili görseli" der, üçüncüsü doğrudan "şu dosyayı
 * tara" der — Google Images indekslemesi için açık davet yalnızca budur.
 * Kısacası bu alan, CSS şerit kararının açtığı boşluğu kapatıyor.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  const posts = getAllPosts();
  const newestPost = posts[0]?.date ?? new Date().toISOString().slice(0, 10);

  return [
    {
      url: base,
      lastModified: newestPost,
      changeFrequency: "daily",
      priority: 1,
      images: [coverUrl(SITE_COVER_SLUG)],
    },
    { url: `${base}/blog`, lastModified: newestPost, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/urunler`, lastModified: newestPost, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/hakkinda`, lastModified: newestPost, changeFrequency: "monthly", priority: 0.5 },
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.date,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [coverUrl(post.slug)],
    })),
  ];
}
