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

async function fetchJson(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status} ${txt}`);
  }
  return await res.json();
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
  if (base.endsWith("/")) base = base.slice(0, -1);
  return base;
}

async function loadLists() {
  try {
    setStatus(true, "JS: loading...");
    const base = getBaseApi();

    // ✅ backend дээр /symbols, /timeframes нэмсэн учраас ингэж авна
    const sym = await fetchJson(`${base}/symbols`);
    const tfs = await fetchJson(`${base}/timeframes`);

    fillSelect(pairSel, sym.symbols, "Symbol");
    fillSelect(tfSel, tfs.timeframes, "Timeframe");

    // default сонголт (дуртайгаа өөрчилж болно)
    pairSel.value = sym.symbols.includes("XAUUSD") ? "XAUUSD" : sym.symbols[0];
    tfSel.value = tfs.timeframes.includes("15m") ? "15m" : tfs.timeframes[0];

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
    const symbol = pairSel.value;
    const tf = tfSel.value;

    if (!symbol || !tf) {
      showError("Symbol болон Timeframe сонго.");
      return;
    }

    // ✅ query param-аа tf гэж явуулж байна (backend tf/timeframe хоёуланг нь дэмжинэ)
    const data = await fetchJson(`${base}/analyze?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`);
    showJson(data);
  } catch (e) {
    showError(e.message);
  }
}

btnLoad.addEventListener("click", loadLists);
btnAnalyze.addEventListener("click", analyze);

// Page нээгдэхэд нэг удаа автоматаар load хийж болно
loadLists();
