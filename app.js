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
  statusEl.style.color = ok ? "#9cff9c" : "#ff8a8a";
}

function showError(msg) {
  outEl.innerHTML = `<div class="bad">API error: ${msg}</div>`;
}

function showJson(obj) {
  outEl.innerHTML = `<div class="ok">✅ Result:</div><pre>${JSON.stringify(obj, null, 2)}</pre>`;
}

function getBaseApi() {
  let base = (apiInput.value || "").trim();
  if (!base) return "";
  if (base.endsWith("/")) base = base.slice(0, -1);
  return base;
}

// Save API base so you don't retype
const API_KEY = "saved_api_base";
const savedBase = localStorage.getItem(API_KEY);
if (savedBase && apiInput) apiInput.value = savedBase;

apiInput.addEventListener("change", () => {
  const v = (apiInput.value || "").trim();
  if (v) localStorage.setItem(API_KEY, v);
});

async function fetchJson(url) {
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return JSON.parse(text);
}

function fillSelect(selectEl, items, placeholder = "Select...") {
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  for (const v of items) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  }
}

async function loadLists() {
  try {
    setStatus(true, "JS: loading...");
    outEl.textContent = "Loading...";

    const base = getBaseApi();
    if (!base) throw new Error("API base URL хоосон байна");

    const syms = await fetchJson(`${base}/symbols`);
    const tfs = await fetchJson(`${base}/timeframes`);

    fillSelect(pairSel, syms.symbols || [], "Symbol");
    fillSelect(tfSel, tfs.timeframes || [], "Timeframe");

    pairSel.value = (syms.symbols || []).includes("XAUUSD") ? "XAUUSD" : (syms.symbols || [])[0] || "";
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
    const base = getBaseApi();
    if (!base) throw new Error("API base URL хоосон байна");

    const symbol = pairSel.value;
    const tf = tfSel.value;
    if (!symbol || !tf) throw new Error("Symbol болон Timeframe сонго");

    setStatus(true, "Analyzing...");
    const data = await fetchJson(`${base}/analyze?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`);
    showJson(data);
    setStatus(true, "Done ✅");
  } catch (e) {
    setStatus(false, "JS: error ❌");
    showError(e.message);
  }
}

// Auto quote refresh (every 2 sec)
async function refreshQuote() {
  try {
    const base = getBaseApi();
    if (!base) return;

    const symbol = pairSel.value || "XAUUSD";
    const q = await fetchJson(`${base}/quote?symbol=${encodeURIComponent(symbol)}`);

    if (q.ok) {
      // show short quote above output
      const line = `Quote ${q.symbol}: bid=${q.bid} ask=${q.ask} (${q.source || "source"})`;
      // keep existing output, just update status text a bit
      setStatus(true, line);
    }
  } catch (e) {
    // ignore to avoid spamming
  }
}

btnLoad.addEventListener("click", loadLists);
btnAnalyze.addEventListener("click", analyze);

loadLists();
setInterval(refreshQuote, 2000);
