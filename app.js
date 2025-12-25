// === SIMPLE, STABLE APP.JS (NO CRASH) ===
document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const pairEl = $("pair");
  const tfEl = $("tf");
  const btnLoad = $("btnLoad");
  const btnAnalyze = $("btnAnalyze");
  const out = $("out");
  const jsStatus = $("jsStatus");

  const SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD"];
  const TFS = ["1m", "5m", "15m", "1h", "4h"];

  // fill dropdowns
  SYMBOLS.forEach(s => {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = s;
    pairEl.appendChild(o);
  });

  TFS.forEach(t => {
    const o = document.createElement("option");
    o.value = t;
    o.textContent = t;
    tfEl.appendChild(o);
  });

  jsStatus.textContent = "JS: loaded ✅";

  btnLoad.onclick = () => {
    out.textContent = "Loaded: " + pairEl.value + " / " + tfEl.value;
  };

  btnAnalyze.onclick = async () => {
    out.textContent = "Analyzing...";

    // DEMO RESULT (backend-гүй ч UI шалгана)
    setTimeout(() => {
      out.innerHTML = `
✅ Result:
{
  "symbol": "${pairEl.value}",
  "timeframe": "${tfEl.value}",
  "trend": "SELL",
  "entry": 2026,
  "stop_loss": 2026.24,
  "take_profit": 2025.58,
  "confidence": "74%"
}
      `;
    }, 800);
  };
});
