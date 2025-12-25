// ===== Helpers =====
const $ = (id) => document.getElementById(id);

function setOut(msg, cls = "") {
  const el = $("out");
  el.className = cls;
  el.textContent = msg;
}

function normalizeBackendUrl(raw) {
  let u = (raw || "").trim();

  // Add https if missing
  if (u && !/^https?:\/\//i.test(u)) u = "https://" + u;

  // Remove trailing slash
  u = u.replace(/\/+$/, "");

  // Detect common typos
  if (u.includes(".onrender.con")) {
    throw new Error("Backend URL буруу байна: '.con' биш '.com' байх ёстой.\nЖишээ: https://signals-backend-su0a.onrender.com");
  }
  if (u.includes(".onrender.cc")) {
    throw new Error("Backend URL буруу байна: '.cc' биш '.com' байх ёстой.\nЖишээ: https://signals-backend-su0a.onrender.com");
  }

  return u;
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Accept": "application/json", ...(opts.headers || {}) },
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) {
    const detail = data ? JSON.stringify(data, null, 2) : text;
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${detail}`);
  }
  return data ?? {};
}

function fillSelect(selectEl, items, fallback) {
  selectEl.innerHTML = "";
  const arr = (items && items.length ? items : fallback);

  for (const v of arr) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  }
}

// ===== Chart (optional simple) =====
let chart, series;
function initChart() {
  if (chart) return;
  chart = LightweightCharts.createChart($("chart"), {
    layout: { background: { type: "solid", color: "#0b0f14" }, textColor: "#cbd5e1" },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    timeScale: { timeVisible: true },
    rightPriceScale: { borderVisible: false },
  });
  series = chart.addLineSeries();
  // Placeholder line
  const now = Math.floor(Date.now() / 1000);
  series.setData([
    { time: now - 300, value: 1 },
    { time: now - 200, value: 1.2 },
    { time: now - 100, value: 0.9 },
    { time: now, value: 1.1 },
  ]);
}
initChart();

// ===== App State =====
let backend = "";

const FALLBACK_SYMBOLS = ["XAUUSD", "XAGUSD", "BTCUSD", "EURUSD", "GBPUSD", "USDJPY"];
const FALLBACK_TF = ["5m", "15m", "30m", "1h", "4h", "1d"];

fillSelect($("pair"), FALLBACK_SYMBOLS, FALLBACK_SYMBOLS);
fillSelect($("tf"), FALLBACK_TF, FALLBACK_TF);

// ===== Actions =====
window.loadBackend = async function loadBackend() {
  $("btnLoad").disabled = true;
  $("btnAnalyze").disabled = true;

  try {
    backend = normalizeBackendUrl($("api").value);
    setOut("⏳ Backend metadata уншиж байна... (эхний удаа 10–50 сек байж болно)", "warn");

    const meta = await fetchJson(`${backend}/`);

    const symbols = meta.supported_symbols || meta.symbols || [];
    const tfs = meta.supported_timeframes || meta.timeframes || [];

    fillSelect($("pair"), symbols, FALLBACK_SYMBOLS);
    fillSelect($("tf"), tfs, FALLBACK_TF);

    setOut("✅ Loaded backend metadata.\nОдоо Analyze дар.", "ok");
    $("btnAnalyze").disabled = false;
  } catch (e) {
    setOut("❌ Load амжилтгүй.\n\n" + (e?.message || String(e)), "bad");
  } finally {
    $("btnLoad").disabled = false;
  }
};

window.askAnalysis = async function askAnalysis() {
  $("btnAnalyze").disabled = true;
  try {
    if (!backend) {
      backend = normalizeBackendUrl($("api").value);
    }

    const symbol = $("pair").value || "XAUUSD";
    const tf = $("tf").value || "15m";

    setOut(`⏳ Analyze хийж байна...\n${backend}/analyze?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`, "warn");

    const data = await fetchJson(`${backend}/analyze?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`);

    setOut("✅ Result:\n" + JSON.stringify(data, null, 2), "ok");
  } catch (e) {
    setOut("❌ Analyze амжилтгүй.\n\n" + (e?.message || String(e)), "bad");
  } finally {
    $("btnAnalyze").disabled = false;
  }
};
