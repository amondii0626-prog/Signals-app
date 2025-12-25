(() => {
  const $ = (id) => document.getElementById(id);

  const elApi = $("api");
  const elPair = $("pair");
  const elTf = $("tf");
  const out = $("out");
  const jsStatus = $("jsStatus");
  const ntfStatus = $("ntfStatus");

  const btnLoad = $("btnLoad");
  const btnAnalyze = $("btnAnalyze");
  const btnNotify = $("btnNotify");

  const elBal = $("bal");
  const elRiskPct = $("riskPct");
  const elEntry = $("entry");
  const elSl = $("sl");
  const btnCalc = $("btnCalc");
  const riskOut = $("riskOut");

  // ===== Defaults =====
  const DEFAULT_BACKEND = "https://signals-backend-su0a.onrender.com";
  const FALLBACK_SYMBOLS = ["XAUUSD", "XAGUSD", "BTCUSD", "EURUSD", "GBPUSD", "USDJPY"];
  const FALLBACK_TF = ["1m","5m","15m","30m","1h","4h","1d"];

  // Contract size assumptions (common broker standards)
  // Used for lot size calc: $ move per 1 lot = contractSize * priceMove (for USD-quoted)
  const CONTRACT_SIZE = {
    "XAUUSD": 100,     // 1 lot = 100 oz
    "XAGUSD": 5000,    // common: 5000 oz
    "BTCUSD": 1,
    "ETHUSD": 1,
    "EURUSD": 100000,
    "GBPUSD": 100000,
    "USDJPY": 100000,
    "AUDUSD": 100000,
    "USDCAD": 100000,
    "USDCHF": 100000,
    "NZDUSD": 100000
  };

  // ===== UI helpers =====
  function setOut(msg, cls="") {
    out.className = "";
    out.textContent = msg;
    if (cls) out.classList.add(cls);
  }
  function safeTrim(s){ return (s||"").trim(); }

  // ===== Chart setup (Lightweight Charts) =====
  const chart = LightweightCharts.createChart($("chart"), {
    layout: { background: { type: "solid", color: "#070a0f" }, textColor: "#e7eef7" },
    grid: { vertLines: { visible: true }, horzLines: { visible: true } },
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false }
  });

  const candleSeries = chart.addCandlestickSeries();
  const lineEntry = chart.addLineSeries({ lineWidth: 2 });
  const lineSL = chart.addLineSeries({ lineWidth: 2 });
  const lineTP = chart.addLineSeries({ lineWidth: 2 });

  let lastCandles = [];
  function fit() { chart.timeScale().fitContent(); }

  function drawHLine(series, price) {
    if (!price || !isFinite(price)) return;
    // draw across last visible candles
    if (!lastCandles.length) {
      const t = Math.floor(Date.now()/1000);
      series.setData([{ time: t-60, value: price }, { time: t, value: price }]);
      return;
    }
    const t1 = lastCandles[0].time;
    const t2 = lastCandles[lastCandles.length - 1].time;
    series.setData([{ time: t1, value: price }, { time: t2, value: price }]);
  }

  function applySignalToChart(sig) {
    const entry = Number(sig?.entry);
    const sl = Number(sig?.stop_loss);
    const tp = Number(sig?.take_profit);
    drawHLine(lineEntry, entry);
    drawHLine(lineSL, sl);
    drawHLine(lineTP, tp);
    fit();
  }

  // ===== Backend helpers =====
  function normalizeBackendUrl(url) {
    url = safeTrim(url);
    if (!url) return DEFAULT_BACKEND;
    if (!url.startsWith("http")) url = "https://" + url;
    return url.replace(/\/+$/,"");
  }

  async function tryFetchJson(url, timeoutMs=45000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try{
      const res = await fetch(url, { signal: ctrl.signal });
      const txt = await res.text();
      let json = null;
      try { json = JSON.parse(txt); } catch { json = null; }
      return { ok: res.ok, status: res.status, json, text: txt };
    } finally {
      clearTimeout(t);
    }
  }

  function fillSelect(selectEl, items, fallback) {
    selectEl.innerHTML = "";
    const arr = Array.isArray(items) && items.length ? items : fallback;
    for (const v of arr) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    }
  }

  // ===== Notifications =====
  let notifyEnabled = false;
  let lastSignalKey = "";
  const beep = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA="); // tiny silent wav (safe placeholder)

  async function enableNotify() {
    try{
      if (!("Notification" in window)) {
        ntfStatus.textContent = "🔔 Notify: not supported";
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        notifyEnabled = true;
        ntfStatus.textContent = "🔔 Notify: ON";
        ntfStatus.classList.add("ok");
        setOut("✅ Notifications enabled. Now Analyze хийх бүрт шинэ signal бол notification гарна.", "ok");
      } else {
        notifyEnabled = false;
        ntfStatus.textContent = "🔔 Notify: denied";
        ntfStatus.classList.add("bad");
        setOut("⚠️ Notification permission зөвшөөрсөнгүй.", "warn");
      }
    } catch(e){
      setOut("Notify error: " + (e?.message || e), "bad");
    }
  }

  function maybeNotify(sig) {
    if (!notifyEnabled) return;
    const key = `${sig?.symbol}|${sig?.timeframe}|${sig?.trend}|${sig?.entry}|${sig?.stop_loss}|${sig?.take_profit}|${sig?.confidence}`;
    if (key === lastSignalKey) return;
    lastSignalKey = key;

    const title = `Signal: ${sig.symbol} ${sig.timeframe}`;
    const body = `${sig.trend} | Entry ${sig.entry} | SL ${sig.stop_loss} | TP ${sig.take_profit} | Conf ${sig.confidence}`;
    try{
      new Notification(title, { body });
      // optional: play short sound if allowed (some browsers block unless user gesture)
      try { beep.play().catch(()=>{}); } catch {}
    } catch {}
  }

  // ===== Risk calculator =====
  function calcLotSize() {
    const bal = Number(safeTrim(elBal.value) || "0");
    const pct = Number(safeTrim(elRiskPct.value) || "0");
    const entry = Number(safeTrim(elEntry.value) || "0");
    const sl = Number(safeTrim(elSl.value) || "0");

    if (!bal || !pct || !entry || !sl) {
      riskOut.textContent = "⚠️ Balance, Risk %, Entry, SL бүгдийг бөглөөрэй.";
      return;
    }
    const riskUsd = bal * (pct/100);
    const dist = Math.abs(entry - sl);
    if (dist <= 0) {
      riskOut.textContent = "⚠️ Entry ба SL зөрүү 0 байна.";
      return;
    }

    const sym = elPair.value || "XAUUSD";
    const contract = CONTRACT_SIZE[sym] ?? 1;

    // Approx USD risk per 1 lot = dist * contract (USD-quoted assumption)
    const riskPerLot = dist * contract;
    const lots = riskUsd / riskPerLot;

    const txt =
`Symbol: ${sym}
Balance: $${bal.toFixed(2)}
Risk: ${pct}%  =>  $${riskUsd.toFixed(2)}
Entry: ${entry}
SL: ${sl}
Distance: ${dist}

Assumed contract size: ${contract} (per 1 lot)
Risk per 1 lot ≈ $${riskPerLot.toFixed(2)}
✅ Suggested lot size ≈ ${lots.toFixed(2)} lots`;

    riskOut.textContent = txt;
  }

  // ===== Candles loading (optional) =====
  async function loadCandles(backend, symbol, tf) {
    // We try common endpoints. If backend doesn't have candles, we still work.
    const endpoints = [
      `${backend}/candles?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}&limit=300`,
      `${backend}/ohlc?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}&limit=300`,
      `${backend}/history?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}&limit=300`
    ];

    for (const url of endpoints) {
      const r = await tryFetchJson(url, 45000);
      if (!r.ok || !r.json) continue;

      // Expect array of {time, open, high, low, close} or {t,o,h,l,c}
      let arr = r.json?.candles ?? r.json?.data ?? r.json;
      if (!Array.isArray(arr) || !arr.length) continue;

      const mapped = arr.map(x => ({
        time: Number(x.time ?? x.t),
        open: Number(x.open ?? x.o),
        high: Number(x.high ?? x.h),
        low: Number(x.low ?? x.l),
        close: Number(x.close ?? x.c),
      })).filter(c => isFinite(c.time) && isFinite(c.open) && isFinite(c.high) && isFinite(c.low) && isFinite(c.close));

      if (mapped.length) return mapped;
    }
    return [];
  }

  // ===== Load metadata =====
  async function loadMeta() {
    const backend = normalizeBackendUrl(elApi.value);
    elApi.value = backend;

    setOut("⏳ Loading backend metadata...", "warn");

    // Try / and /health and /meta
    const probes = [`${backend}/meta`, `${backend}/health`, `${backend}/`];
    let meta = null;

    for (const p of probes) {
      const r = await tryFetchJson(p, 55000);
      if (r.ok && r.json) { meta = r.json; break; }
    }

    const symbols = meta?.supported_symbols || meta?.symbols || FALLBACK_SYMBOLS;
    const tfs = meta?.supported_timeframes || meta?.timeframes || FALLBACK_TF;

    fillSelect(elPair, symbols, FALLBACK_SYMBOLS);
    fillSelect(elTf, tfs, FALLBACK_TF);

    jsStatus.textContent = "JS: ✅ loaded";
    jsStatus.classList.add("ok");

    // load candles (optional)
    const symbol = elPair.value;
    const tf = elTf.value;

    const candles = await loadCandles(backend, symbol, tf);
    if (candles.length) {
      lastCandles = candles;
      candleSeries.setData(candles);
      fit();
      setOut("✅ Loaded backend metadata + candles. Одоо Analyze дар.", "ok");
    } else {
      lastCandles = [];
      candleSeries.setData([]);
      setOut("✅ Loaded backend metadata. (Candles endpoint байхгүй бол chart хоосон байж болно) Одоо Analyze дар.", "ok");
    }
  }

  // ===== Analyze =====
  async function analyze() {
    const backend = normalizeBackendUrl(elApi.value);
    elApi.value = backend;

    const symbol = elPair.value || "XAUUSD";
    const tf = elTf.value || "15m";

    setOut("⏳ Analyzing... (Render Free бол 20–50 сек хүлээж магадгүй)", "warn");

    // Analyze endpoints (try a few common)
    const urls = [
      `${backend}/analyze?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`,
      `${backend}/signal?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`,
      `${backend}/predict?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`
    ];

    let sig = null;
    let lastText = "";

    for (const u of urls) {
      const r = await tryFetchJson(u, 65000);
      lastText = r.text || "";
      if (r.ok && r.json) { sig = r.json; break; }
    }

    if (!sig) {
      setOut("❌ Analyze failed.\n" + (lastText || "No response JSON"), "bad");
      return;
    }

    // Ensure minimum keys
    const pretty = JSON.stringify(sig, null, 2);
    setOut("✅ Result:\n" + pretty, "ok");

    // Auto-fill risk fields
    if (sig.entry != null) elEntry.value = String(sig.entry);
    if (sig.stop_loss != null) elSl.value = String(sig.stop_loss);

    // Apply to chart
    applySignalToChart(sig);

    // Notify
    maybeNotify(sig);
  }

  // ===== When symbol/tf changed: reload candles if possible =====
  async function reloadCandlesIfAny() {
    const backend = normalizeBackendUrl(elApi.value);
    const symbol = elPair.value;
    const tf = elTf.value;
    const candles = await loadCandles(backend, symbol, tf);
    if (candles.length) {
      lastCandles = candles;
      candleSeries.setData(candles);
      fit();
    } else {
      lastCandles = [];
      candleSeries.setData([]);
    }
  }

  // ===== Wire events =====
  btnLoad.addEventListener("click", loadMeta);
  btnAnalyze.addEventListener("click", analyze);
  btnNotify.addEventListener("click", enableNotify);
  btnCalc.addEventListener("click", calcLotSize);

  elPair.addEventListener("change", reloadCandlesIfAny);
  elTf.addEventListener("change", reloadCandlesIfAny);

  // ===== Init =====
  elApi.value = DEFAULT_BACKEND;
  elBal.value = "10000";
  elRiskPct.value = "1";
  jsStatus.textContent = "JS: loading...";
  setOut("Ready.", "");
})();
