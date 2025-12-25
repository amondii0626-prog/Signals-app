// Helper
const $ = (id) => document.getElementById(id);

// Elements (ID нь index.html дээрхтэй 100% таарах ёстой)
const statusEl = $("jsStatus");
const outEl = $("out");

const apiInput = $("api");
const pairSel = $("pairSel"); // ✅ зөв ID: pairSel
const tfSel = $("tf");        // ✅ зөв ID: tf

const btnLoad = $("btnLoad");
const btnAnalyze = $("btnAnalyze");

// UI helpers
function setStatus(ok, msg) {
  if (statusEl) statusEl.textContent = msg;
}

function showError(err) {
  outEl.innerHTML = `<div class="bad">API error: ${err}</div>`;
}

function showJson(obj) {
  outEl.innerHTML = `<div class="ok">✅ Result:</div><pre>${JSON.stringify(obj, null, 2)}</pre>`;
}

async function fetchJson(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status} ${txt}`);
  }
  return await res.json();
}

function fillSelect(selectEl, arr, placeholder = "Select...") {
  if (!selectEl) return;

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
  let base = (apiInput?.value || "").trim();
  if (!base) return "";
  if (base.endsWith("/")) base = base.slice(0, -1);
  return base;
}

// Load symbols/timeframes
async function loadLists() {
  try {
    setStatus(true, "JS: loading...");
    outEl.textContent = "Loading...";

    const base = getBaseApi();
    if (!base) throw new Error("API URL хоосон байна");

    const sym = await fetchJson(`${base}/symbols`);
    const tfs = await fetchJson(`${base}/timeframes`);

    fillSelect(pairSel, sym.symbols || [], "Symbol");
    fillSelect(tfSel, tfs.timeframes || [], "Timeframe");

    // default сонголт
    if (sym.symbols?.includes("XAUUSD")) pairSel.value = "XAUUSD";
    if (tfs.timeframes?.includes("15m")) tfSel.value = "15m";

    outEl.textContent = "Ready.";
    setStatus(true, "JS: loaded ✅");
  } catch (e) {
    setStatus(false, "JS: error ❌");
    showError(e.message);
  }
}

// Analyze
async function analyze() {
  try {
    const base = getBaseApi();
    if (!base) throw new Error("API URL хоосон байна");

    const symbol = pairSel?.value || "";
    const tf = tfSel?.value || "";

    if (!symbol || !tf) {
      showError("Symbol болон Timeframe сонго.");
      return;
    }

    // backend чинь параметр нэрийг symbol, tf гэж авдаг
    const url = `${base}/analyze?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`;
    const data = await fetchJson(url);
    showJson(data);
  } catch (e) {
    showError(e.message);
  }
}

// Events
btnLoad?.addEventListener("click", loadLists);
btnAnalyze?.addEventListener("click", analyze);

// Auto load when page opens
window.addEventListener("load", loadLists);
