// =========================
// Trading Signals - app.js
// Backend: /health , /analyze?symbol=...&timeframe=...
// =========================

const DEFAULT_SYMBOLS = [
  "XAUUSD",
  "BTCUSD",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "US30",
  "NAS100",
  "SPX500",
];

const DEFAULT_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];

const $ = (id) => document.getElementById(id);

const els = {
  api: $("api"),
  pair: $("pair"),
  tf: $("tf"),
  btnLoad: $("btnLoad"),
  btnAnalyze: $("btnAnalyze"),
  jsStatus: $("jsStatus"),
  mtStatus: $("mtStatus"),
  out: $("out"),
  chart: $("chart"),
  // risk calc
  balance: $("bal"),
  risk: $("risk"),
  entry: $("entry"),
  sl: $("sl"),
  btnCalc: $("btnCalc"),
  riskOut: $("riskOut"),
};

function setStatus(text, ok = true) {
  if (els.out) els.out.innerText = text;
  if (els.jsStatus) {
    els.jsStatus.innerText = ok ? "JS: loaded ✅" : "JS: error ❌";
  }
}

function baseUrl() {
  // remove trailing slash
  return (els.api.value || "").trim().replace(/\/+$/, "");
}

function fillSelect(selectEl, items, placeholder = "Select") {
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  items.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
}

async function checkHealth() {
  const url = baseUrl();
  if (!url) return;

  try {
    const r = await fetch(`${url}/health`, { method: "GET" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    els.mtStatus.innerText = j.ok ? "🔔 Backend: ON ✅" : "🔔 Backend: ???";
  } catch (e) {
    els.mtStatus.innerText = "🔔 Backend: OFF ❌";
  }
}

async function onLoadClicked() {
  // Because backend has NO /symbols and NO /timeframes,
  // we fill dropdowns from static lists.
  fillSelect(els.pair, DEFAULT_SYMBOLS, "Symbol сонго");
  fillSelect(els.tf, DEFAULT_TIMEFRAMES, "Timeframe сонго");
  await checkHealth();
  setStatus("Ready.");
}

async function onAnalyzeClicked() {
  const url = baseUrl();
  if (!url) {
    setStatus("API URL хоосон байна. Дээрх талбарт backend линкээ тавь.", false);
    return;
  }

  const symbol = els.pair.value;
  const timeframe = els.tf.value;

  if (!symbol || !timeframe) {
    setStatus("Эхлээд Symbol болон Timeframe сонго.", false);
    return;
  }

  setStatus("Analyzing...");

  try {
    // backend expects query params: symbol, timeframe
    const qs = new URLSearchParams({ symbol, timeframe }).toString();
    const r = await fetch(`${url}/analyze?${qs}`, { method: "GET" });

    if (!r.ok) {
      let txt = await r.text();
      setStatus(`API error ${r.status}: ${txt}`, false);
      return;
    }

    const data = await r.json();

    // show result pretty
    const pretty = JSON.stringify(data, null, 2);
    els.out.innerText = "✅ Result:\n" + pretty;

    // Auto-fill risk calc fields if present
    if (data.entry !== undefined && els.entry) els.entry.value = data.entry;
    if (data.stop_loss !== undefined && els.sl) els.sl.value = data.stop_loss;

  } catch (e) {
    setStatus("Network error: " + e.message, false);
  }
}

// ----- Risk calculator (simple) -----
function calcLotSize() {
  const bal = parseFloat(els.balance?.value || "0");
  const riskPct = parseFloat(els.risk?.value || "0");
  const entry = parseFloat(els.entry?.value || "0");
  const sl = parseFloat(els.sl?.value || "0");

  if (!bal || !riskPct || !entry || !sl) {
    els.riskOut.innerText = "Мэдээллээ бүрэн бөглөнө үү.";
    return;
  }

  const riskMoney = bal * (riskPct / 100);
  const distance = Math.abs(entry - sl);

  if (distance === 0) {
    els.riskOut.innerText = "Entry ба Stop Loss адил байна.";
    return;
  }

  // NOTE: This is a generic estimate, you can customize per symbol later.
  // For XAUUSD often 1 lot = 100 oz; pip value differs by broker.
  // Here we just show a proportional lot based on price distance.
  const lot = riskMoney / distance;

  els.riskOut.innerText = `Ойролцоогоор: ${lot.toFixed(4)} lot (ерөнхий тооцоо)`;
}

// ----- Init -----
(function init() {
  if (els.jsStatus) els.jsStatus.innerText = "JS: loaded ✅";

  // Buttons
  els.btnLoad?.addEventListener("click", onLoadClicked);
  els.btnAnalyze?.addEventListener("click", onAnalyzeClicked);
  els.btnCalc?.addEventListener("click", calcLotSize);

  // Auto load once
  onLoadClicked();
})();
