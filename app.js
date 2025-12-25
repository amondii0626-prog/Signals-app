const DEFAULT_SYMBOLS = ["XAUUSD","BTCUSD","EURUSD","GBPUSD","USDJPY","US30","NAS100","SPX500"];
const DEFAULT_TIMEFRAMES = ["1m","5m","15m","30m","1h","4h"];

const apiInput = document.getElementById("api");
const pairSelect = document.getElementById("pair");
const tfSelect = document.getElementById("tf");
const btnLoad = document.getElementById("btnLoad");
const btnAnalyze = document.getElementById("btnAnalyze");
const out = document.getElementById("out");
const jsStatus = document.getElementById("jsStatus");

// Risk calc inputs (байхгүй бол алдаа гаргахгүйгээр шалгана)
const entryInp = document.getElementById("entry");
const slInp = document.getElementById("sl");

function init() {
  jsStatus.textContent = "JS: loaded ✅";

  pairSelect.innerHTML = "";
  DEFAULT_SYMBOLS.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    pairSelect.appendChild(opt);
  });

  tfSelect.innerHTML = "";
  DEFAULT_TIMEFRAMES.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    tfSelect.appendChild(opt);
  });
}
init();

function safeText(html) {
  out.innerHTML = html;
}

btnLoad.onclick = async () => {
  const api = apiInput.value.trim().replace(/\/+$/, ""); // төгсгөлийн /-уудыг авч хаяна
  out.textContent = "Checking backend...";

  try {
    const res = await fetch(api + "/health", { cache: "no-store" });
    if (!res.ok) throw new Error("Backend not responding");
    const data = await res.json();
    safeText(`✅ Backend OK<br><small>${api}/health → ${JSON.stringify(data)}</small>`);
  } catch (e) {
    safeText(`<span style="color:#ff6b6b">API error: ${e.message}</span>`);
  }
};

btnAnalyze.onclick = async () => {
  const api = apiInput.value.trim().replace(/\/+$/, "");
  const symbol = pairSelect.value;
  const tf = tfSelect.value;

  if (!api || !symbol || !tf) {
    safeText(`<span style="color:#ff6b6b">Fill all fields</span>`);
    return;
  }

  safeText(`Analyzing...<br><small>Sending → symbol=${symbol}, timeframe=${tf}</small>`);

  try {
    // Query params-ийг баталгаатай encode хийе
    const url = `${api}/analyze?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(tf)}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Analyze failed (${res.status}) ${t}`);
    }

    const data = await res.json();

    // Backend буцаасан timeframe сонгосонтой зөрвөл анхааруулна
    const warn =
      data.timeframe && data.timeframe !== tf
        ? `<div style="color:#ffcc00;font-size:12px;margin-top:6px">
            ⚠ Backend timeframe зөрж байна: selected=${tf}, returned=${data.timeframe}
           </div>`
        : "";

    safeText(
      `✅ Result:<pre>${JSON.stringify(data, null, 2)}</pre>${warn}`
    );

    // Autofill
    if (entryInp) entryInp.value = data.entry ?? "";
    if (slInp) slInp.value = data.stop_loss ?? "";

  } catch (e) {
    safeText(`<span style="color:#ff6b6b">API error: ${e.message}</span>`);
  }
};
