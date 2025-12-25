const $ = (id) => document.getElementById(id);

const statusEl = $("jsStatus");
const outEl = $("out");

const apiInput = $("api");
const pairSel = $("pair");
const tfSel = $("tf");

const btnLoad = $("btnLoad");
const btnAnalyze = $("btnAnalyze");

// default fallback (backend дээр /symbols, /timeframes байхгүй үед)
const FALLBACK_SYMBOLS = ["XAUUSD", "BTCUSD", "EURUSD"];
const FALLBACK_TFS = ["1m", "5m", "15m", "1h"];

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function showError(msg) {
  if (!outEl) return;
  outEl.innerHTML = `<div class="bad">API error: ${msg}</div>`;
}

function showJson(obj) {
  if (!outEl) return;
  outEl.innerHTML = `<div class="ok">✅ Result:</div><pre>${JSON.stringify(obj, null, 2)}</pre>`;
}

function getBaseApi() {
  let b = (apiInput?.value || "").trim();
  if (!b) b = "https://signals-backend-su0a.onrender.com"; // default
  if (b.endsWith("/")) b = b.slice(0, -1);
  return b;
}

async function fetchJson(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${res.status}${txt ? " " + txt : ""}`);
  }
  return await res.json();
}

function fillSelect(sel, arr, placeholder) {
  if (!sel) return;
  sel.innerHTML = "";

  const p = document.createElement("option");
  p.value = "";
  p.textContent = placeholder;
  sel.appendChild(p);

  for (const v of arr) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    sel.appendChild(o);
  }
}

async function loadLists() {
  try {
    setStatus("JS: loading...");

    const base = getBaseApi();

    // symbols/timeframes авахыг оролдоно, болохгүй бол fallback ашиглана
    let symbols = FALLBACK_SYMBOLS;
    let tfs = FALLBACK_TFS;

    try {
      const s = await fetchJson(`${base}/symbols`);
      symbols = s.symbols || s.data || s || FALLBACK_SYMBOLS;
    } catch (_) {}

    try {
      const t = await fetchJson(`${base}/timeframes`);
      tfs = t.timeframes || t.data || t || FALLBACK_TFS;
    } catch (_) {}

    fillSelect(pairSel, symbols, "Symbol");
    fillSelect(tfSel, tfs, "Timeframe");

    // default сонголтууд
    if (pairSel && symbols.length) pairSel.value = symbols.includes("XAUUSD") ? "XAUUSD" : symbols[0];
    if (tfSel && tfs.length) tfSel.value = tfs.includes("15m") ? "15m" : tfs[0];

    setStatus("JS: loaded ✅");
    if (outEl) outEl.textContent = "Ready.";
  } catch (e) {
    setStatus("JS: error ❌");
    showError(e.message);
  }
}

// /analyze дээр tf эсвэл timeframe аль нь таарахыг автоматаар шалгана
async function analyze() {
  try {
    const base = getBaseApi();
    const symbol = pairSel?.value || "";
    const tf = tfSel?.value || "";

    if (!symbol || !tf) return showError("Symbol / Timeframe сонго");

    // 1) эхлээд tf гэж үзээд үзнэ
    try {
      const data1 = await fetchJson(`${base}/analyze?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`);
      return showJson(data1);
    } catch (_) {}

    // 2) дараа нь timeframe гэж үзээд үзнэ
    const data2 = await fetchJson(`${base}/analyze?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(tf)}`);
    return showJson(data2);

  } catch (e) {
    showError(e.message);
  }
}

// Button events
btnLoad?.addEventListener("click", loadLists);
btnAnalyze?.addEventListener("click", analyze);

// DOM бүрэн ачаалсны дараа автоматаар ажиллуулна (null алдааг 100% зогсооно)
window.addEventListener("load", loadLists);
