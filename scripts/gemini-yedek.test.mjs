import { test } from "node:test";
import assert from "node:assert/strict";
import { anthropicIstegi, geminiModelleri, hesapSeviyesiHata } from "./gemini-yedek.mjs";

const SEMA = { type: "object", properties: { a: { type: "string" } }, required: ["a"] };
const GOVDE = {
  model: "claude-sonnet-5-5",
  max_tokens: 100,
  system: "sistem",
  messages: [{ role: "user", content: "merhaba" }],
  output_config: { format: { type: "json_schema", schema: SEMA } },
};
const ENV = { GEMINI_API_KEY: "gizli-anahtar-123" };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status });
const geminiOk = (metin) => json({ choices: [{ message: { content: metin }, finish_reason: "stop" }], usage: { prompt_tokens: 3, completion_tokens: 4 } });

/** Yönlendirmeli sahte fetch: Anthropic ve Gemini çağrılarını sayar. */
function sahte(anthropic, gemini) {
  const cagrilar = { anthropic: 0, gemini: [] };
  const fetchFn = async (url, init) => {
    if (url.includes("anthropic.com")) {
      cagrilar.anthropic++;
      return anthropic();
    }
    const govde = JSON.parse(init.body);
    cagrilar.gemini.push(govde);
    assert.equal(init.headers.Authorization, `Bearer ${ENV.GEMINI_API_KEY}`);
    return gemini(govde);
  };
  return { fetchFn, cagrilar };
}

test("hesapSeviyesiHata: hesap seviyesini tanır, sıradan 400/429'u tanımaz", () => {
  assert.ok(hesapSeviyesiHata(402) && hesapSeviyesiHata(401) && hesapSeviyesiHata(503));
  assert.ok(hesapSeviyesiHata(429, "usage limit reached"));
  assert.ok(hesapSeviyesiHata(400, "Your credit balance is too low"));
  assert.ok(!hesapSeviyesiHata(429, "slow down") && !hesapSeviyesiHata(400, "bad schema"));
});

for (const [durum, govde] of [[402, "credit"], [429, "monthly usage limit"], [401, "invalid x-api-key"]]) {
  test(`Anthropic ${durum} -> Gemini çağrılır, yanıt Anthropic şeklinde`, async () => {
    const { fetchFn, cagrilar } = sahte(() => json({ error: govde }, durum), () => geminiOk('{"a":"gemini"}'));
    const res = await anthropicIstegi({ apiKey: "k", govde: GOVDE, env: ENV, fetchFn });
    const veri = await res.json();
    assert.equal(veri.content[0].text, '{"a":"gemini"}');
    assert.deepEqual(veri.usage, { input_tokens: 3, output_tokens: 4 });
    assert.equal(cagrilar.gemini[0].model, "gemini-3.1-flash-lite");
    assert.deepEqual(cagrilar.gemini[0].messages[0], { role: "system", content: "sistem" });
    assert.deepEqual(cagrilar.gemini[0].response_format.json_schema.schema, SEMA);
  });
}

test("Anthropic başarılı -> Gemini hiç çağrılmaz", async () => {
  const { fetchFn, cagrilar } = sahte(() => json({ content: [] }), () => geminiOk("{}"));
  const res = await anthropicIstegi({ apiKey: "k", govde: GOVDE, env: ENV, fetchFn });
  assert.equal(res.status, 200);
  assert.equal(cagrilar.gemini.length, 0);
});

test("GEMINI_API_KEY yok -> Anthropic'in hata yanıtı aynen döner", async () => {
  const { fetchFn, cagrilar } = sahte(() => json({ error: "credit" }, 402), () => geminiOk("{}"));
  const res = await anthropicIstegi({ apiKey: "k", govde: GOVDE, env: {}, fetchFn });
  assert.equal(res.status, 402);
  assert.equal(cagrilar.gemini.length, 0);
});

test("tek 5xx tekrar denenir, düzelirse Gemini yok; ard arda 5xx -> Gemini", async () => {
  let n = 0;
  const bir = sahte(() => (n++ === 0 ? json({}, 503) : json({ content: [] })), () => geminiOk("{}"));
  assert.equal((await anthropicIstegi({ apiKey: "k", govde: GOVDE, env: ENV, fetchFn: bir.fetchFn })).status, 200);
  assert.equal(bir.cagrilar.gemini.length, 0);

  const iki = sahte(() => json({}, 503), () => geminiOk('{"a":"x"}'));
  const veri = await (await anthropicIstegi({ apiKey: "k", govde: GOVDE, env: ENV, fetchFn: iki.fetchFn })).json();
  assert.equal(iki.cagrilar.anthropic, 2);
  assert.equal(veri.content[0].text, '{"a":"x"}');
});

test("sıradan 400 -> Gemini çağrılmaz", async () => {
  const { fetchFn, cagrilar } = sahte(() => json({ error: "invalid schema" }, 400), () => geminiOk("{}"));
  assert.equal((await anthropicIstegi({ apiKey: "k", govde: GOVDE, env: ENV, fetchFn })).status, 400);
  assert.equal(cagrilar.gemini.length, 0);
});

test("ilk model düşerse ikinciye geçer; bozuk çıktı -> Anthropic'in orijinal hatası (uydurma yok)", async () => {
  const iki = sahte(() => json({}, 402), (g) => (g.model === "gemini-3.1-flash-lite" ? json({}, 500) : geminiOk('{"a":"2"}')));
  const veri = await (await anthropicIstegi({ apiKey: "k", govde: GOVDE, env: ENV, fetchFn: iki.fetchFn })).json();
  assert.deepEqual(iki.cagrilar.gemini.map((g) => g.model), ["gemini-3.1-flash-lite", "gemini-3.8-flash"]);
  assert.equal(veri.content[0].text, '{"a":"2"}');

  const bozuk = sahte(() => json({}, 402), () => geminiOk('{"b":1}'));
  assert.equal((await anthropicIstegi({ apiKey: "k", govde: GOVDE, env: ENV, fetchFn: bozuk.fetchFn })).status, 402);
  assert.equal(bozuk.cagrilar.gemini.length, 2);
});

test("GEMINI_FALLBACK_MODEL ilk sırayı ezer; anahtar loga basılmaz", async () => {
  assert.deepEqual(geminiModelleri({ GEMINI_FALLBACK_MODEL: "gemini-3.8-flash" }), ["gemini-3.8-flash", "gemini-3.1-flash-lite"]);
  const satirlar = [];
  const eski = [console.warn, console.error];
  console.warn = console.error = (...a) => satirlar.push(a.join(" "));
  try {
    const { fetchFn } = sahte(() => json({}, 402), () => geminiOk('{"a":"1"}'));
    await anthropicIstegi({ apiKey: "k", govde: GOVDE, env: ENV, fetchFn });
  } finally {
    [console.warn, console.error] = eski;
  }
  assert.ok(satirlar.some((s) => s.includes("[AI-PROVIDER] Gemini last-resort call")));
  assert.ok(!satirlar.join(" ").includes(ENV.GEMINI_API_KEY));
});
