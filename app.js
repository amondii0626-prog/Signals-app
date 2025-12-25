const resultBox = document.getElementById("result");
const symbolSel = document.getElementById("symbol");
const tfSel = document.getElementById("timeframe");

function setResult(text) {
  resultBox.textContent = text;
}

function normalizeBaseUrl(u) {
  return (u || "").trim().replace(/\/$/, "");
}

function saveBackend() {
  const url = normalizeBaseUrl(document.getElementById("backendUrl").value);
  if (!url) {
    alert("Backend URL оруулна уу");
    return;
  }
  localStorage.setItem("backendUrl", url);
  setResult("✅ Backend saved:\n" + url + "\n\nОдоо Analyze дар.");
  loadMeta(); // supported symbols/timeframes татна
}

function fillSelect(selectEl, items, defaultValue) {
  selectEl.innerHTML = "";
  items.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    if (v === defaultValue) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

async function loadMeta() {
  const baseUrl =
    normalizeBaseUrl(document.getElementById("backendUrl").value) ||
    localStorage.getItem("backendUrl");

  if (!baseUrl) return;

  try {
    setResult("⏳ Loading supported symbols/timeframes...\n" + baseUrl + "/");
    const res = await fetch(baseUrl + "/");
    const data = await res.json();

    const symbols = data.supported_symbols || ["XAUUSD"];
    const tfs = data.supported_timeframes || ["15m"];

    fillSelect(symbolSel, symbols, "XAUUSD");
    fillSelect(tfSel, tfs, "15m");

    setResult("✅ Loaded backend metadata.\nОдоо Analyze дар.");
  } catch (e) {
    setResult("⚠️ Backend metadata уншиж чадсангүй.\n" + e.message);
  }
}

async function analyze() {
  const baseUrl =
    normalizeBaseUrl(document.getElementById("backendUrl").value) ||
    localStorage.getItem("backendUrl");

  if (!baseUrl) {
    alert("Backend URL оруулаад Load дарна уу");
    return;
  }

  const symbol = symbolSel.value || "XAUUSD";
  const tf = tfSel.value || "15m";

  const url = `${baseUrl}/analyze?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`;

  try {
    setResult("⏳ Analyzing...\n" + url);
    const res = await fetch(url);
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
  } catch (err) {
    setResult("❌ ERROR:\n" + err.message);
  }
}

window.onload = () => {
  const saved = localStorage.getItem("backendUrl");
  if (saved) {
    document.getElementById("backendUrl").value = saved;
    loadMeta();
  } else {
    // default lists (backend байхгүй үед)
    fillSelect(symbolSel, ["XAUUSD","XAGUSD","BTCUSD","EURUSD","GBPUSD","USDJPY"], "XAUUSD");
    fillSelect(tfSel, ["1m","5m","15m","30m","1h","4h","1d"], "15m");
  }
};
