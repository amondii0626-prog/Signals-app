// ====== Helpers ======
const $ = (id) => document.getElementById(id);

function log(obj) {
  if (typeof obj === "string") {
    $("output").textContent = obj;
  } else {
    $("output").textContent = JSON.stringify(obj, null, 2);
  }
}

function normBaseUrl(url) {
  let u = (url || "").trim();
  if (!u) return "";
  // remove trailing slash
  u = u.replace(/\/+$/, "");
  return u;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ====== Chart setup ======
let chart, series;
let priceLines = [];

function initChart() {
  const el = $("chart");
  chart = LightweightCharts.createChart(el, {
    layout: {
      background: { type: "solid", color: "transparent" },
      textColor: "rgba(229,231,235,0.9)",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    },
    grid: {
      vertLines: { color: "rgba(255,255,255,0.06)" },
      horzLines: { color: "rgba(255,255,255,0.06)" },
    },
    timeScale: { timeVisible: true, secondsVisible: false },
    rightPriceScale: { borderColor: "rgba(255,255,255,0.10)" },
    crosshair: { mode: 0 },
  });

  series = chart.addCandlestickSeries({
    upColor: "#22c55e",
    downColor: "#ef4444",
    wickUpColor: "#22c55e",
    wickDownColor: "#ef4444",
    borderVisible: false,
  });

  // initial dummy candles so chart isn't empty
  const now = Math.floor(Date.now() / 1000);
  const base = 2000;
  const data = [];
  for (let i = 60; i >= 1; i--) {
    const t = now - i * 60;
    const o = base + Math.sin(i / 6) * 2;
    const c = base + Math.sin((i + 1) / 6) * 2;
    const h = Math.max(o, c) + 1.2;
    const l = Math.min(o, c) - 1.2;
    data.push({ time: t, open: o, high: h, low: l, close: c });
  }
  series.setData(data);

  window.addEventListener("resize", () => {
    chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
  });
}

function clearPriceLines() {
  try {
    priceLines.forEach((pl) => series.removePriceLine(pl));
  } catch (e) {}
  priceLines = [];
}

function addLevelLine(price, title, color) {
  const pl = series.createPriceLine({
    price,
    color,
    lineWidth: 2,
    lineStyle: 2,
    axisLabelVisible: true,
    title,
  });
  priceLines.push(pl);
}

function drawSignal(signal) {
  clearPriceLines();

  const trend = (signal.trend || "").toUpperCase();
  const entry = Number(signal.entry);
  const sl = Number(signal.stop_loss);
  const tp = Number(signal.take_profit);

  if (Number.isFinite(entry)) addLevelLine(entry, `ENTRY ${entry}`, "#3b82f6");
  if (Number.isFinite(sl)) addLevelLine(sl, `SL ${sl}`, "#ef4444");
  if (Number.isFinite(tp)) addLevelLine(tp, `TP ${tp}`, "#22c55e");

  // marker
  const now = Math.floor(Date.now() / 1000);
  const marker = {
    time: now,
    position: trend === "BUY" ? "belowBar" : "aboveBar",
    color: trend === "BUY" ? "#22c55e" : "#ef4444",
    shape: trend === "BUY" ? "arrowUp" : "arrowDown",
    text: `${trend || "SIGNAL"} ${Number.isFinite(entry) ? entry : ""}`,
  };
  series.setMarkers([marker]);
}

// ====== Backend calls ======
let supportedSymbols = ["XAUUSD"];
let supportedTF = ["15m"];

function fillSelect(selectEl, values, fallback) {
  selectEl.innerHTML = "";
  (values && values.length ? values : fallback).forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
}

async function loadBackendMeta() {
  const baseUrl = normBaseUrl($("api").value);
  if (!baseUrl) {
    alert("Backend URL оруулна уу.");
    return;
  }

  localStorage.setItem("backend_url", baseUrl);

  log("Loading backend metadata... (Render Free бол эхний удаа удаж магадгүй)");
  $("btnLoad").disabled = true;

  try {
    // root endpoint
    const r = await fetch(baseUrl + "/", { method: "GET" });
    const txt = await r.text();

    let meta;
    try {
      meta = JSON.parse(txt);
    } catch {
      meta = { raw: txt };
    }

    // tolerate different keys
    supportedSymbols = meta.supported_symbols || meta.symbols || supportedSymbols;
    supportedTF = meta.supported_timeframes || meta.timeframes || supportedTF;

    fillSelect($("pair"), supportedSymbols, ["XAUUSD", "BTCUSD", "XAGUSD", "EURUSD"]);
    fillSelect($("tf"), supportedTF, ["15m", "30m", "1h", "4h", "1d"]);

    log({
      ok: true,
      message: "Loaded backend metadata. Одоо Analyze дар.",
      backend: baseUrl,
      supported_symbols: supportedSymbols,
      supported_timeframes: supportedTF,
    });
  } catch (e) {
    log({ ok: false, error: String(e) });
    alert("Load алдаа: " + e);
  } finally {
    $("btnLoad").disabled = false;
  }
}

async function analyze() {
  const baseUrl = normBaseUrl($("api").value);
  if (!baseUrl) {
    alert("Backend URL оруулна уу.");
    return;
  }

  const symbol = $("pair").value || "XAUUSD";
  const tf = $("tf").value || "15m";

  localStorage.setItem("backend_url", baseUrl);
  localStorage.setItem("symbol", symbol);
  localStorage.setItem("tf", tf);

  $("btnAnalyze").disabled = true;
  log(`Analyzing: ${symbol} ${tf} ...`);

  try {
    // IMPORTANT: /analyze is GET with query params
    const url = `${baseUrl}/analyze?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`;
    const r = await fetch(url, { method: "GET" });
    const txt = await r.text();

    let data;
    try {
      data = JSON.parse(txt);
    } catch {
      data = { raw: txt };
    }

    // If backend returned FastAPI error like {"detail":"Not Found"} or {"detail":[...]}
    if (data && data.detail) {
      log(data);
      alert("Backend error: " + JSON.stringify(data));
      return;
    }

    // normalize numeric rounding
    if (data.entry != null) data.entry = Number(data.entry);
    if (data.stop_loss != null) data.stop_loss = Number(data.stop_loss);
    if (data.take_profit != null) data.take_profit = Number(data.take_profit);

    log(data);
    drawSignal(data);
  } catch (e) {
    log({ ok: false, error: String(e) });
    alert("Analyze алдаа: " + e);
  } finally {
    $("btnAnalyze").disabled = false;
  }
}

// ====== Init ======
initChart();

// restore saved values
(function restore() {
  const savedUrl = localStorage.getItem("backend_url");
  const savedSym = localStorage.getItem("symbol");
  const savedTf = localStorage.getItem("tf");

  if (savedUrl) $("api").value = savedUrl;

  fillSelect($("pair"), supportedSymbols, ["XAUUSD", "BTCUSD", "XAGUSD", "EURUSD"]);
  fillSelect($("tf"), supportedTF, ["15m", "30m", "1h", "4h", "1d"]);

  if (savedSym) $("pair").value = savedSym;
  if (savedTf) $("tf").value = savedTf;
})();

$("btnLoad").addEventListener("click", loadBackendMeta);
$("btnAnalyze").addEventListener("click", analyze);
