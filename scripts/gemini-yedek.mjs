/**
 * Blog motorunun Gemini son-çare katmanı (Anthropic /v1/messages isteğini sarar).
 * Gemini YALNIZ Anthropic hesap seviyesinde hata verirse çağrılır: credit/billing/usage limit,
 * 401/403, "limit" diyen 429 ya da ard arda 5xx. Anthropic çalışırken asla; GEMINI_API_KEY yoksa
 * katman kapalıdır ve çağıran Anthropic'in hata yanıtını aynen görür.
 */
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_DENEME_SURESI_MS = 15_000;

export function hesapSeviyesiHata(durum, govde = "") {
  if (durum === 401 || durum === 402 || durum === 403 || durum >= 500) return true;
  if (durum === 429) return /limit/i.test(govde);
  return durum === 400 && /credit|billing|usage limit|spend limit/i.test(govde);
}

export function geminiModelleri(env = process.env) {
  const istenen = (env.GEMINI_FALLBACK_MODEL ?? "").trim();
  const ilk = /^gemini-[a-z0-9.-]+$/i.test(istenen) ? istenen : "gemini-3.1-flash-lite";
  return [...new Set([ilk, "gemini-3.1-flash-lite", "gemini-3.8-flash"])];
}

/** Anthropic gövdesi -> OpenAI-uyumlu gövde (system üst düzeyden mesaja, output_config şeması response_format'a). */
function geminiGovdesi(govde, model) {
  const sema = govde.output_config?.format?.schema;
  return {
    model,
    max_tokens: govde.max_tokens,
    messages: [...(govde.system ? [{ role: "system", content: govde.system }] : []), ...govde.messages],
    ...(sema && { response_format: { type: "json_schema", json_schema: { name: "cikti", strict: true, schema: sema } } }),
  };
}

/** shortcut: yalnız kök `required` anahtarları denetlenir; asıl doğrulamayı motorun kalite kapısı (validatePost) yapar. */
function semayaUyuyor(metin, sema) {
  try {
    const nesne = JSON.parse(metin);
    return Boolean(nesne) && typeof nesne === "object" && !Array.isArray(nesne) && (sema?.required ?? []).every((k) => k in nesne);
  } catch {
    return false;
  }
}

async function geminiSonCare(govde, env, fetchFn) {
  const sema = govde.output_config?.format?.schema;
  for (const model of geminiModelleri(env)) {
    const t0 = Date.now();
    console.warn(`[AI-PROVIDER] Gemini last-resort call (model: ${model}; fallback from: ${govde.model})`);
    try {
      const res = await fetchFn(GEMINI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(geminiGovdesi(govde, model)),
        signal: AbortSignal.timeout(GEMINI_DENEME_SURESI_MS),
      });
      if (!res.ok) {
        console.error(`[AI-PROVIDER] Gemini ${model} fail ${Date.now() - t0}ms (HTTP ${res.status})`);
        if (res.status === 401 || res.status === 403) break; // kötü anahtar başka modelde düzelmez
        continue;
      }
      const veri = await res.json();
      const secim = veri?.choices?.[0];
      const metin = secim?.message?.content ?? "";
      if (sema && !semayaUyuyor(metin, sema)) {
        console.error(`[AI-PROVIDER] Gemini ${model} fail ${Date.now() - t0}ms (şemaya uymadı)`);
        continue;
      }
      console.warn(`[AI-PROVIDER] Gemini ${model} ok ${Date.now() - t0}ms`);
      return new Response(
        JSON.stringify({
          content: [{ type: "text", text: metin }],
          stop_reason: secim.finish_reason === "length" ? "max_tokens" : "end_turn",
          usage: { input_tokens: veri.usage?.prompt_tokens ?? 0, output_tokens: veri.usage?.completion_tokens ?? 0 },
        }),
        { status: 200 },
      );
    } catch {
      console.error(`[AI-PROVIDER] Gemini ${model} fail ${Date.now() - t0}ms`);
    }
  }
  return null;
}

/**
 * Anthropic'e gönderir; başarılıysa onun yanıtını, hesap seviyesinde hata + Gemini anahtarı varsa
 * Anthropic şeklinde sentetik Gemini yanıtını, aksi hâlde Anthropic'in (hatalı) yanıtını döndürür.
 */
export async function anthropicIstegi({ apiKey, govde, env = process.env, fetchFn = fetch }) {
  const gonder = () =>
    fetchFn(ANTHROPIC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(govde),
    });
  let res = await gonder();
  if (res.status >= 500) res = await gonder(); // "ard arda 5xx": ikinci 5xx hesap seviyesi sayılır
  if (res.ok || !env.GEMINI_API_KEY) return res;
  const metin = await res.clone().text().catch(() => "");
  if (!hesapSeviyesiHata(res.status, metin)) return res;
  return (await geminiSonCare(govde, env, fetchFn)) ?? res;
}
