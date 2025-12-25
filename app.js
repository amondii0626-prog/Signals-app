const $ = (id) => document.getElementById(id);

const statusEl = $("jsStatus");
const outEl = $("out");

const apiInput = $("api");
const pairSel = $("pair");
const tfSel = $("tf");

const btnLoad = $("btnLoad");
const btnAnalyze = $("btnAnalyze");

function setStatus(ok, msg) {
  statusEl.textContent = msg;
  statusEl.style.opacity = "1";
}

function showError(err) {
  outEl.innerHTML = `<div class="bad">API error: ${err}</div>`;
}

function showJson(obj) {
  outEl.innerHTML = `<div class="ok">✅ Result:</div><pre>${JSON.stringify(obj, null, 2)}</pre>`;
}

function normalizeBase(url) {
  return (url || "").trim().replace(/\/+$/, "");
}

// ✅ 1 удаа бичээд хадгалах
const LS_KEY = "signals_api_base";
function loadSavedApi() {
  const saved = localStorage.getItem(LS_KEY);
  if (saved) apiInput.value = saved;
}
function saveApiIfValid() {
  const base = normalizeBase(apiInput.value);
  if (!base) return null;
  localStorage.setItem(LS_KEY, base);
  return base;
}

async function fetchJson(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${res.status} ${txt}`.trim());
  }
  return res.json();
}

function fillSelect(sel, arr, placeholder = "Select...") {
  sel.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  sel.appendChild(opt0);

  for (const v of arr) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  }
}

async function loadLists() {
  try {
    setStatus(true, "JS: loading...");
    outEl.textContent = "Loading...";

    const base = saveApiIfValid();
    if (!base) throw new Error("API link хоосон байна");

    // backend endpoints
    const syms = await fetchJson(`${base}/symbols`);
    const tfs = await fetchJson(`${base}/timeframes`);

    fillSelect(pairSel, syms.symbols || [], "Symbol");
    fillSelect(tfSel, tfs.timeframes || [], "Timeframe");

    // default
    if ((syms.symbols || []).includes("XAUUSD")) pairSel.value = "XAUUSD";
    tfSel.value = (tfs.timeframes || []).includes("15m") ? "15m" : (tfs.timeframes || [])[0] || "";

    setStatus(true, "JS: loaded ✅");
    outEl.textContent = "Ready.";
  } catch (e) {
    setStatus(false, "JS: error ❌");
    showError(e.message);
  }
}

async function analyze() {
  try {
    const base = saveApiIfValid();
    if (!base) throw new Error("API link хоосон байна");

    const symbol = pairSel.value;
    const tf = tfSel.value;

    if (!symbol || !tf) throw new Error("Symbol болон Timeframe сонго");

    const url = `${base}/analyze?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`;
    const data = await fetchJson(url);
    showJson(data);
  } catch (e) {
    showError(e.message);
  }
}

// events
btnLoad.addEventListener("click", loadLists);
btnAnalyze.addEventListener("click", analyze);

// init
loadSavedApi();
setStatus(true, "JS: loaded ✅");
outEl.textContent = "Ready.";
