import { MetadataRoute } from "next";
import { site } from "@/lib/brand-facts";

/**
 * robots.txt — AI motorları için EXPLICIT allow.
 *
 * `User-agent: *  Allow: /` teknik olarak zaten hepsini kapsar. Buna rağmen
 * botları tek tek yazmamızın iki somut sebebi var:
 *
 * 1. Google-Extended ve Applebot-Extended birer TARAYICI DEĞİLDİR. Sayfa
 *    çekmezler; yalnızca "bu içerik Gemini / Apple Intelligence yanıtlarında
 *    kullanılabilir mi" iznini taşırlar. Bu tokenlar bazı platform şablonlarında
 *    varsayılan olarak Disallow gelir — açıkça Allow yazmak niyeti kilitler.
 *
 * 2. Atıf almak isteyen bir site için ASIL kritik ajanlar eğitim botları değil,
 *    ARAMA/GETİRME ajanlarıdır: OAI-SearchBot ve ChatGPT-User (ChatGPT),
 *    Claude-SearchBot ve Claude-User (Claude), PerplexityBot ve Perplexity-User.
 *    GPTBot/ClaudeBot eğitim tarafıdır — onları da açıyoruz çünkü hedefimiz
 *    modelin bitkiakademisi.com'u bir kaynak olarak tanıması.
 *
 * Bloklanan tek şey Next.js iç yolları (/_next/) — içerik değil, build çıktısı.
 */

const AI_AGENTS = [
  // OpenAI / ChatGPT
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic / Claude
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Google (Gemini / AI Overviews grounding izni)
  "Google-Extended",
  // Apple Intelligence
  "Applebot",
  "Applebot-Extended",
  // Microsoft Copilot / Bing
  "bingbot",
  // Diğer AI arama ve asistanları
  "DuckAssistBot",
  "Amazonbot",
  "cohere-ai",
  "Meta-ExternalAgent",
  "MistralAI-User",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/_next/"] },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
