import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";
import { site } from "@/lib/brand-facts";

/**
 * Sitemap posts'tan türetilir — günlük pipeline yeni makaleyi
 * content/generated-posts.json'a eklediğinde burası kendiliğinden büyür.
 * Elle güncelleme gerekmez.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  const posts = getAllPosts();
  const newestPost = posts[0]?.date ?? new Date().toISOString().slice(0, 10);

  return [
    { url: base, lastModified: newestPost, changeFrequency: "daily", priority: 1 },
    { url: `${base}/blog`, lastModified: newestPost, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/hakkinda`, lastModified: newestPost, changeFrequency: "monthly", priority: 0.5 },
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.date,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
