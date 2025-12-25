// ====== CONFIG (би энд default backend-ийг чинь тавьсан) ======
const DEFAULT_API = "https://signals-backend-su0a.onrender.com";

// ====== Helpers ======
const $ = (id) => document.getElementById(id);

const jsStatusEl = $("jsStatus");
const ntStatusEl = $("ntStatus");
const outEl = $("out");

const apiInput = $("api");
const pairSel = $("pair");
const tfSel = $("tf");

const btnLoad = $("btnLoad");
const btnAnalyze = $("btnAnalyze");
const btnNotify = $("btnNotify");

const balEl = $("bal");
const riskPctEl = $("riskPct");
const entryEl = $("entry");
const slEl = $("sl");
const btnCalc = $("btnCalc");
const riskOutEl = $("riskOut");

// ====== UI status ======
function setJsStatus(ok, msg) {
  jsStatusEl.textContent = msg;
  jsStatusEl.classList.remove("ok", "bad");
  jsStatusEl.classList.add(ok ? "ok" : "bad");
}

function showError(msg) {
  outEl.innerHTML = `<div class="bad">API error: ${msg}</div>`;
}

function showJson(obj) {
  outEl.innerHTML = `<div class="ok">✅ Result:</div><pre>${JSON.stringify(obj, null, 2)}</pre>`;
}

function fillSelect(selectEl, arr, placeholder = "Select...") {
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  for (const v of arr) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  }
}

function getBaseApi() {
  let base = (apiInput.value || "").trim();
  if (!base) base = DEFAULT_API;
  if (base.endsWith("/")) base = base.slice(0, -1);
  return base;
}

async function fetchJson(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status} ${t}`);
  }
  return await res.json();
}

// ====== Chart ======
let chart = null;
let lineSeries = null;

function initChart() {
  if (!window.LightweightCharts) return;

  chart = LightweightCharts.createChart($("chart"), {
    width: $("chart").clientWidth,
    height: 360,
    layout: { background: { type: "solid", color: "#0a0d14" }, textColor: "#cbd5ff" },
    grid: { vertLines: { color: "rgba(255,255,255,0.06)" }, horzLines: { color: "rgba(255,255,255,0.06)" } },
    rightPriceScale: { borderColor: "rgba(255,255,255,0.10)" },
    timeScale: { borderColor: "rgba(255,255,255,0.10)" },
  });

  lineSeries = chart.addLineSeries();

  // resize
  window.addEventListener("resize", () => {
    if (!chart) return;
    chart.applyOptions({ width: $("chart").clientWidth });
  });

  // simple dummy line so chart not empty
  const now = Math.floor(Date.now() / 1000);
  const data = Array.from({ length: 40 }).map((_, i) => ({
    time: now - (40 - i) * 60,
    value: 100 + Math.sin(i / 4) * 2,
  }));
  lineSeries.setData(data);
}

// ====== Load lists (with fallback) ======
const FALLBACK_SYMBOLS = ["XAUUSD", "BTCUSD", "EURUSD", "GBPUSD", "USDJPY"];
const FALLBACK_TF = ["1m", "5m", "15m", "1h", "4h", "1d"];

async function loadLists() {
  try {
    setJsStatus(true, "JS: loading…");
    const base = getBaseApi();

    // Try backend endpoints first. If they don't exist, use fallback.
    let symbols = null;
    let tfs = null;

    try {
      const sym = await fetchJson(`${base}/symbols`);
      // accept {symbols:[...]} or [...]
      symbols = Array.isArray(sym) ? sym : sym.symbols;
    } catch (_) {
      symbols = FALLBACK_SYMBOLS;
    }

    try {
      const tf = await fetchJson(`${base}/timeframes`);
      tfs = Array.isArray(tf) ? tf : tf.timeframes;
    } catch (_) {
      tfs = FALLBACK_TF;
    }

    fillSelect(pairSel, symbols, "Symbol");
    fillSelect(tfSel, tfs, "Timeframe");

    // default selection
    if (symbols.includes("XAUUSD")) pairSel.value = "XAUUSD";
    else pairSel.value = symbols[0] || "";

    if (tfs.includes("15m")) tfSel.value = "15m";
    else tfSel.value = tfs[0] || "";

    setJsStatus(true, "JS: loaded ✅");
    outEl.textContent = "Ready.";
  } catch (e) {
    setJsStatus(false, "JS: error ❌");
    showError(e.message);
  }
}

// ====== Analyze ======
async function analyze() {
  try {
    const base = getBaseApi();
    const symbol = pairSel.value;
    const tf = tfSel.value;

    if (!symbol || !tf) {
      showError("Symbol болон Timeframe сонго.");
      return;
    }

    // backend expects: /analyze?symbol=...&tf=...
    const url = `${base}/analyze?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`;
    const data = await fetchJson(url);

    showJson(data);

    // Auto fill risk fields
    if (data && typeof data.entry !== "undefined") entryEl.value = data.entry;
    if (data && typeof data.stop_loss !== "undefined") slEl.value = data.stop_loss;

  } catch (e) {
    showError(e.message);
  }
}

// ====== Notify (simple demo) ======
let notifyOn = false;
let notifyTimer = null;

function setNotifyUI() {
  ntStatusEl.textContent = notifyOn ? "🔔 Notify: on" : "🔔 Notify: off";
  btnNotify.textContent = notifyOn ? "Disable Notify" : "Enable Notify";
}

function toggleNotify() {
  notifyOn = !notifyOn;
  setNotifyUI();

  if (notifyTimer) {
    clearInterval(notifyTimer);
    notifyTimer = null;
  }

  if (notifyOn) {
    // every 60s auto analyze
    notifyTimer = setInterval(() => {
      analyze().catch(() => {});
    }, 60000);
  }
}

// ====== Risk Calculator ======
function calcLot() {
  const balance = parseFloat((balEl.value || "0").trim());
  const riskPct = parseFloat((riskPctEl.value || "0").trim());
  const entry = parseFloat((entryEl.value || "0").trim());
  const sl = parseFloat((slEl.value || "0").trim());

  if (!balance || !riskPct || !entry || !sl) {
    riskOutEl.innerHTML = `<div class="bad">Balance / Risk / Entry / SL бөглөөд Calculate дар.</div>`;
    return;
  }

  const riskMoney = balance * (riskPct / 100);
  const dist = Math.abs(entry - sl);

  if (dist <= 0) {
    riskOutEl.innerHTML = `<div class="bad">Entry ба SL хоорондын зай 0 байна.</div>`;
    return;
  }

  // VERY SIMPLE lot estimate:
  // XAUUSD: 1 lot ~ 100 oz. $1 move ~= $100 per lot
  // Forex: 1 lot = 100k units (not used here precisely)
  let lot = 0;

  // crude detection
  const sym = (pairSel.value || "").toUpperCase();
  if (sym.includes("XAU")) {
    // $ per 1.00 move per 1 lot ≈ 100
    lot = riskMoney / (dist * 100);
  } else {
    // generic: assume $10 per pip per lot (very rough)
    lot = riskMoney / (dist * 10);
  }

  lot = Math.max(0, lot);
  const lotRounded = Math.round(lot * 100) / 100;

  riskOutEl.innerHTML = `<div class="ok">Risk $${riskMoney.toFixed(2)} | Distance ${dist.toFixed(4)} | Lot ≈ <b>${lotRounded}</b></div>`;
}

// ====== Init ======
(function init() {
  // set default API if empty
  if (!apiInput.value || apiInput.value.includes("xxxx")) {
    apiInput.value = DEFAULT_API;
  }

  initChart();
  setNotifyUI();

  btnLoad.addEventListener("click", loadLists);
  btnAnalyze.addEventListener("click", analyze);
  btnNotify.addEventListener("click", toggleNotify);
  btnCalc.addEventListener("click", calcLot);

  // auto load on open
  loadLists();
})();
