// Helper
const $ = (id) => document.getElementById(id);

// Elements (index.html-тэй ТААРСАН ID-ууд)
const statusEl = $("jsStatus");
const outEl = $("out");

const apiInput = $("api");
const pairSel = $("pair"); // ✅ index.html дээр id="pair"
const tfSel = $("tf");     // ✅ index.html дээр id="tf"

const btnLoad = $("btnLoad");
const btnAnalyze = $("btnAnalyze");

// UI helpers
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function showError(err) {
  outEl.innerHTML = `<div class="bad">API error: ${err}</div>`;
}

function showJson(obj) {
  outEl.innerHTML =
    `<div class="ok">✅ Result:</div><pre>${JSON.stringify(obj, null, 2)}</pre>`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
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

function getBaseApi() {
  let b = apiInput.value.trim();
  if (b.endsWith("/")) b = b.slice(0, -1);
  return b;
}

// Load symbols + timeframes
async function loadLists() {
  try {
    setStatus("JS: loading...");
    outEl.textContent = "Loading...";

    const base = getBaseApi();
    if (!base) throw new Error("API URL хоосон");

    const symbols = await fetchJson(`${base}/symbols`);
    const tfs = await fetchJson(`${base}/timeframes`);

    fillSelect(pairSel, symbols.symbols, "Symbol");
    fillSelect(tfSel, tfs.timeframes, "Timeframe");

    pairSel.value = "XAUUSD";
    tfSel.value = "15m";

    setStatus("JS: loaded ✅");
    outEl.textContent = "Ready.";
  } catch (e) {
    setStatus("JS: error ❌");
    showError(e.message);
  }
}

// Analyze
async function analyze() {
  try {
    const base = getBaseApi();
    const symbol = pairSel.value;
    const tf = tfSel.value;

    if (!symbol || !tf) {
      showError("Symbol / Timeframe сонго");
      return;
    }

    const data = await fetchJson(
      `${base}/analyze?symbol=${symbol}&tf=${tf}`
    );
    showJson(data);
  } catch (e) {
    showError(e.message);
  }
}

// Events
btnLoad.onclick = loadLists;
btnAnalyze.onclick = analyze;
window.onload = loadLists;
