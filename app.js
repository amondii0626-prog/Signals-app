// app.js (paste ALL)
(() => {
  const $ = (id) => document.getElementById(id);

  const elApi = $("api");
  const elPair = $("pair");
  const elTf = $("tf");
  const elOut = $("out");
  const elJs = $("jsStatus");
  const elNt = $("ntStatus");

  const btnLoad = $("btnLoad");
  const btnAnalyze = $("btnAnalyze");
  const btnNotify = $("btnNotify");

  // Optional (if you add later)
  const elEntry = $("entry");
  const elSL = $("sl");
  const elBalance = $("bal");
  const elRisk = $("risk");
  const btnCalc = $("btnCalc");

  // chart
  let chart, series;
  let autoTimer = null;
  let notifyEnabled = false;
  let lastSignalKey = "";

  const FALLBACK_SYMBOLS = ["XAUUSD", "XAGUSD", "BTCUSD", "EURUSD", "GBPUSD", "USDJPY"];
  const FALLBACK_TF = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

  function normalizeBaseUrl(url) {
    url = (url || "").trim();
    if (!url) return "";
    // remove trailing slash
    return url.replace(/\/+$/, "");
  }

  function setOut(msg, cls = "") {
    elOut.className = cls;
    elOut.textContent = msg;
  }

  function setPill(el, text, cls = "") {
    el.textContent = text;
    el.className = "pill " + (cls || "");
  }

  async function apiFetch(path, options = {}) {
    const base = normalizeBaseUrl(elApi.value);
    if (!base) throw new Error("API URL хоосон байна.");
    const url = base + path;

    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`API error ${res.status}: ${t || res.statusText}`);
    }
    return res.json();
  }

  function fillSelect(selectEl, items) {
    selectEl.innerHTML = "";
    for (const v of items) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    }
  }

  function ensureChart() {
    if (chart && series) return;
    const container = $("chart");
    if (!container) return;

    // LightweightCharts loaded from index.html
    chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: 360,
      layout: { background: { type: "solid", color: "transparent" }, textColor: "#CFE6FF" },
      grid: { vertLines: { color: "rgba(255,255,255,0.05)" }, horzLines: { color: "rgba(255,255,255,0.05)" } },
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    series = chart.addCandlestickSeries();

    window.addEventListener("resize", () => {
      try {
        chart.applyOptions({ width: container.clientWidth });
      } catch {}
    });
  }

  async function loadSymbolsAndTF() {
    setPill(elJs, "JS: loading...", "warn");
    setOut("Loading…", "warn");

    // 1) health
    await apiFetch("/health");

    // 2) symbols + timeframes
    const s = await apiFetch("/symbols");
    const t = await apiFetch("/timeframes");

    const symbols = (s && s.symbols && s.symbols.length) ? s.symbols : FALLBACK_SYMBOLS;
    const tfs = (t && t.timeframes && t.timeframes.length) ? t.timeframes : FALLBACK_TF;

    fillSelect(elPair, symbols);
    fillSelect(elTf, tfs);

    setPill(elJs, "JS: loaded ✅", "ok");
    setOut("Ready.", "ok");
  }

  async function loadCandles(symbol, tf) {
    ensureChart();
    if (!series) return;

    const data = await apiFetch(`/candles?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}&limit=200`);
    const candles = (data && data.candles) ? data.candles : [];

    // LightweightCharts needs: time (unix seconds), open/high/low/close
    series.setData(candles.map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    })));
  }

  async function doAnalyze() {
    const symbol = elPair.value;
    const tf = elTf.value;
    if (!symbol || !tf) {
      setOut("Symbol/Timeframe сонгоогүй байна.", "bad");
      return;
    }

    setOut("Analyzing…", "warn");
    const result = await apiFetch("/analyze", {
      method: "POST",
      body: JSON.stringify({ symbol, timeframe: tf }),
    });

    // show result
    setOut("✅ Result:\n" + JSON.stringify(result, null, 2), "ok");

    // auto-fill risk calculator fields if exists
    if (elEntry) elEntry.value = result.entry ?? "";
    if (elSL) elSL.value = result.stop_loss ?? "";

    // notify if enabled and changed
    const key = `${result.symbol}|${result.timeframe}|${result.trend}|${result.entry}|${result.stop_loss}|${result.take_profit}`;
    if (notifyEnabled && lastSignalKey && key !== lastSignalKey) {
      const title = `Signal changed: ${result.symbol} ${result.timeframe}`;
      const body = `${result.trend} | Entry: ${result.entry} | SL: ${result.stop_loss} | TP: ${result.take_profit} | Conf: ${result.confidence}`;
      try { new Notification(title, { body }); } catch {}
    }
    lastSignalKey = key;

    // update chart
    await loadCandles(symbol, tf);
  }

  async function enableNotify() {
    if (!("Notification" in window)) {
      setPill(elNt, "Notify: not supported", "bad");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      notifyEnabled = true;
      setPill(elNt, "🔔 Notify: ON", "ok");
      try { new Notification("Trading Signals", { body: "Notifications enabled." }); } catch {}
    } else {
      notifyEnabled = false;
      setPill(elNt, "🔔 Notify: off", "warn");
    }
  }

  // OPTIONAL: Auto analyze every 60s (toggle by long-press or you can add a checkbox later)
  function startAuto() {
    if (autoTimer) return;
    autoTimer = setInterval(() => {
      doAnalyze().catch(e => setOut(String(e.message || e), "bad"));
    }, 60000);
  }
  function stopAuto() {
    if (!autoTimer) return;
    clearInterval(autoTimer);
    autoTimer = null;
  }

  // Risk calculator (very simple)
  function calcLot() {
    // This is a placeholder. Real lot calc depends on symbol pip value & broker contract size.
    if (!elBalance || !elRisk || !elEntry || !elSL) return;
    const bal = parseFloat(elBalance.value || "0");
    const riskPct = parseFloat(elRisk.value || "0");
    const entry = parseFloat(elEntry.value || "0");
    const sl = parseFloat(elSL.value || "0");
    if (!bal || !riskPct || !entry || !sl) return;

    const riskMoney = bal * (riskPct / 100);
    const dist = Math.abs(entry - sl);
    if (dist <= 0) return;

    // crude estimate
    const lot = riskMoney / (dist * 100);
    $("riskOut").textContent = `Lot ≈ ${lot.toFixed(2)} (demo calc)`;
  }

  // Bind UI
  btnLoad?.addEventListener("click", () => {
    loadSymbolsAndTF().catch(e => setOut(String(e.message || e), "bad"));
  });

  btnAnalyze?.addEventListener("click", () => {
    doAnalyze().catch(e => setOut(String(e.message || e), "bad"));
  });

  btnNotify?.addEventListener("click", () => {
    enableNotify().catch(e => setOut(String(e.message || e), "bad"));
  });

  btnCalc?.addEventListener("click", calcLot);

  // Auto-start: try load on open (optional)
  // loadSymbolsAndTF().catch(() => {});

  // initial pills
  setPill(elJs, "JS: loaded ✅", "ok");
  setPill(elNt, "🔔 Notify: off", "warn");
})();
