// ===== CONFIG =====
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

const DEFAULT_TIMEFRAMES = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
];

// ===== ELEMENTS =====
const apiInput = document.getElementById("api");
const pairSelect = document.getElementById("pair");
const tfSelect = document.getElementById("tf");
const btnLoad = document.getElementById("btnLoad");
const btnAnalyze = document.getElementById("btnAnalyze");
const out = document.getElementById("out");
const jsStatus = document.getElementById("jsStatus");

// ===== INIT =====
function init() {
  jsStatus.textContent = "JS: loaded ✅";

  // Fill symbols
  pairSelect.innerHTML = "";
  DEFAULT_SYMBOLS.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    pairSelect.appendChild(opt);
  });

  // Fill timeframes
  tfSelect.innerHTML = "";
  DEFAULT_TIMEFRAMES.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    tfSelect.appendChild(opt);
  });
}

init();

// ===== LOAD (just check backend) =====
btnLoad.onclick = async () => {
  const api = apiInput.value.trim();
  out.textContent = "Checking backend...";

  try {
    const res = await fetch(api + "/health");
    if (!res.ok) throw new Error("Backend not responding");
    const data = await res.json();
    out.textContent = "Backend OK ✅";
  } catch (e) {
    out.innerHTML = `<span style="color:red">API error: ${e.message}</span>`;
  }
};

// ===== ANALYZE =====
btnAnalyze.onclick = async () => {
  const api = apiInput.value.trim();
  const symbol = pairSelect.value;
  const tf = tfSelect.value;

  if (!api || !symbol || !tf) {
    out.innerHTML = `<span style="color:red">Fill all fields</span>`;
    return;
  }

  out.textContent = "Analyzing...";

  try {
    const url = `${api}/analyze?symbol=${symbol}&timeframe=${tf}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Analyze failed");

    const data = await res.json();
    out.innerHTML =
      `<pre>✅ Result:\n${JSON.stringify(data, null, 2)}</pre>`;

    // Autofill risk calculator
    document.getElementById("entry").value = data.entry ?? "";
    document.getElementById("sl").value = data.stop_loss ?? "";
  } catch (e) {
    out.innerHTML = `<span style="color:red">API error: ${e.message}</span>`;
  }
};
