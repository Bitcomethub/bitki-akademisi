/*
 * ph.js: PostHog analitigi (POSTHOG-1). Tum portfoy sitelerinde AYNI dosya; site farki
 * yalniz <script> etiketindeki data-* ozelliklerinde:
 *   data-product="vitrin"            her olaya product ozelligi
 *   data-links='{"/baslat":"start"}' dahili yol -> cta_id (istege bagli)
 *   data-skip="/admin,/panel"        bu yol onekleri hic izlenmez (istege bagli)
 *   data-hosts="a.co,www.a.co"       yalniz bu hostlarda calisir (musteri alan adlarini disarida birakir)
 *
 * Neden npm paketi degil: lockfile/pnpm-minimumReleaseAge cakismasi yok, bundle'a girmez,
 * yuklenemezse (reklam engelleyici, ag) sayfa etkilenmez; her sey try/catch ve async.
 *
 * KVKK: cerez/localStorage YOK (persistence 'memory'), kisi profili YOK, autocapture KAPALI
 * (form alani/input degeri hic okunmaz), URL'den utm_* disindaki sorgu parametreleri silinir,
 * oturum kaydi/anket/feature-flag kapali, Do-Not-Track'e saygi. Olaylar kendi alan adimizdan
 * /ingest uzerinden gider (Next rewrite), PostHog'a dogrudan istek yok.
 *
 * Olay semasi: pageview/pageleave (otomatik), cta_click {cta_id,page}, scroll_depth {depth,page},
 * signup_started, signup_completed, checkout_started, checkout_completed, demo_requested, first_value.
 * Uygulama kodundan: window.phTrack('checkout_started', {package:'hizli'}).
 * Bildirimsel: <a data-cta="hero_start"> -> cta_click; data-ph="demo_requested" -> o olay.
 */
(function () {
  try {
    var TOKEN = "phc_uEyJZFUFXVrPrxV5rYvfAaFSJqsggoaj5Yz5iVRgn8Fi";
    var w = window, d = document;
    if (w.__phLoaded) return;
    w.__phLoaded = 1;

    var local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);
    var testMode = false;
    try { testMode = w.localStorage.getItem("ph_local") === "1"; } catch (e) {}
    if (local && !testMode) return; // dev gurultusu yok; dogrulama icin localStorage.ph_local=1

    var el = d.currentScript || d.querySelector('script[src^="/ph.js"]');
    var ds = (el && el.dataset) || {};
    var product = ds.product || location.hostname;
    if (ds.hosts && ds.hosts.split(",").indexOf(location.hostname) < 0 && !testMode) return;
    var links = {}, skip = ["/admin", "/panel", "/api"];
    try { if (ds.links) links = JSON.parse(ds.links); } catch (e) {}
    if (ds.skip) skip = ds.skip.split(",");

    // Minimal stub: array.js yuklenince kuyruktaki capture/register cagrilarini kendisi oynatir.
    var ph = (w.posthog = w.posthog || []);
    if (!ph.__SV) {
      ph._i = [];
      ph.init = function (k, cfg, name) {
        var s = d.createElement("script");
        s.async = true;
        s.src = cfg.api_host + "/static/array.js";
        s.onerror = function () {}; // sessizce yok ol
        d.head.appendChild(s);
        ph._i.push([k, cfg, name]);
      };
      ["capture", "register"].forEach(function (m) {
        ph[m] = function () { ph.push([m].concat([].slice.call(arguments))); };
      });
      ph.__SV = 1;
    }

    function path() { return location.pathname; }
    function skipped(p) { return skip.some(function (s) { return p === s || p.indexOf(s + "/") === 0; }); }
    function cleanUrl(u) {
      if (!u || typeof u !== "string") return u;
      try {
        var x = new URL(u, location.href), keep = [];
        x.searchParams.forEach(function (v, k) { if (/^utm_/i.test(k)) keep.push([k, v]); });
        x.search = "";
        keep.forEach(function (kv) { x.searchParams.append(kv[0], kv[1]); });
        x.hash = "";
        return x.toString();
      } catch (e) { return u; }
    }

    ph.init(TOKEN, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      person_profiles: "identified_only",
      persistence: "memory",
      capture_pageview: "history_change",
      capture_pageleave: true,
      autocapture: false,
      rageclick: false,
      capture_dead_clicks: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_flags: true,
      advanced_disable_decide: true,
      respect_dnt: true,
      opt_out_useragent_filter: testMode, // otomasyonla dogrulama (ph_local) icin bot filtresini kapat
      before_send: function (ev) {
        try {
          var p = ev && ev.properties;
          if (!p) return ev;
          if (skipped(path())) return null;
          p.product = product;
          if (testMode) { p.ph_test = true; (w.__phEvents = w.__phEvents || []).push(ev.event); } // dogrulama icin
          p.$current_url = cleanUrl(p.$current_url);
          p.$referrer = cleanUrl(p.$referrer);
          if (testMode) w.__phUrl = p.$current_url; // dogrulama: gonderilen URL
        } catch (e) {}
        return ev;
      },
    });

    function track(name, props) {
      try {
        var o = props || {};
        if (o.page === undefined) o.page = path();
        w.posthog.capture(name, o); // her cagrida w.posthog: array.js yuklenince nesne degisir
      } catch (e) {}
    }
    w.phTrack = track;

    // Tiklama: data-cta/data-ph, magaza/whatsapp/tel/mailto baglantilari, data-links yollari.
    function ctaOf(a) {
      var h = a.getAttribute && a.getAttribute("href");
      if (!h) return null;
      if (/^https?:\/\/(apps|itunes)\.apple\.com/.test(h)) return "store_ios";
      if (/^https?:\/\/play\.google\.com/.test(h)) return "store_android";
      if (/^https?:\/\/testflight\.apple\.com/.test(h)) return "testflight";
      if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)/.test(h)) return "whatsapp";
      if (/^tel:/i.test(h)) return "tel";
      if (/^mailto:/i.test(h)) return "mailto";
      try {
        var u = new URL(h, location.href);
        if (u.origin === location.origin) {
          if (links[u.pathname]) return links[u.pathname];
        } else if (/^https?:$/.test(u.protocol)) {
          return "outbound:" + u.hostname.replace(/^www\./, ""); // yalniz alan adi, yol/sorgu yok
        }
      } catch (e) {}
      return null;
    }
    d.addEventListener("click", function (e) {
      try {
        var t = e.target && e.target.closest && e.target.closest("[data-ph],[data-cta],a[href]");
        if (!t) return;
        var evName = t.getAttribute("data-ph");
        var id = t.getAttribute("data-cta") || ctaOf(t);
        if (evName) track(evName, id ? { cta_id: id } : {});
        else if (id) track("cta_click", { cta_id: id });
      } catch (err) {}
    }, true);
    d.addEventListener("submit", function (e) {
      try {
        var f = e.target;
        var evName = f.getAttribute && f.getAttribute("data-ph");
        var id = f.getAttribute && f.getAttribute("data-cta");
        if (evName) track(evName, id ? { cta_id: id } : {});
        else if (id) track("cta_click", { cta_id: id });
      } catch (err) {}
    }, true);

    // Scroll derinligi: sayfa basina 25/50/75/100 bir kez; yalniz gercek scroll'da.
    var seen = {}, curPath = path(), ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        try {
          var p = path();
          if (p !== curPath) { curPath = p; seen = {}; }
          var h = d.documentElement.scrollHeight;
          if (!h) return;
          var pct = ((w.scrollY || d.documentElement.scrollTop) + w.innerHeight) / h * 100;
          [25, 50, 75, 100].forEach(function (m) {
            if (pct >= m - 1 && !seen[m]) { seen[m] = 1; track("scroll_depth", { depth: m }); }
          });
        } catch (e) {}
      });
    }
    w.addEventListener("scroll", onScroll, { passive: true });
  } catch (e) {}
})();
