// ===============================
// FINAL STABLE app.js
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // -------- UI --------
  const pair = $("pair");
  const tf = $("tf");
  const api = $("api");
  const out = $("out");
  const jsStatus = $("jsStatus");

  const btnLoad = $("btnLoad");
  const btnAnalyze = $("btnAnalyze");

  // Risk
  const bal = $("bal");
  const risk = $("risk");
  const entryEl = $("entry");
  const slEl = $("sl");
  const riskOut = $("riskOut");
  const btnCalc = $("btnCalc");

  // -------- Defaults --------
  const SYMBOLS = ["XAUUSD", "XAGUSD", "BTCUSD", "EURUSD", "GBPUSD"];
  const TFS = ["1m", "5m", "15m", "30m", "1h", "4h"];

  const CONTRACT = {
    XAUUSD: 100,
    XAGUSD: 5000,
    BTCUSD: 1,
    EURUSD: 100000,
    GBPUSD: 100000
  };

  // -------- Helpers --------
  function fillSelect(el, arr) {
    el.innerHTML = "";
    arr.forEach(v => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      el.appendChild(o);
    });
  }

  function setOut(text) {
    out.textContent = text;
  }

  // -------- Init --------
  fillSelect(pair, SYMBOLS);
  fillSelect(tf, TFS);
  jsStatus.textContent = "JS: loaded ✅";

  // -------- Load --------
  btnLoad.onclick = () => {
    setOut("Loaded: " + pair.value + " / " + tf.value);
  };

  // -------- Analyze (demo + backend ready) --------
  btnAnalyze.onclick = async () => {
    setOut("Analyzing...");

    // 🔸 ОДОО demo result (backend-тэй холбож болно)
    const result = {
      symbol: pair.value,
      timeframe: tf.value,
      trend: "SELL",
      entry: 2026,
      stop_loss: 2026.24,
      take_profit: 2025.58,
      confidence: 74
    };

    // Show result
    setOut(JSON.stringify(result, null, 2));

    // Auto fill risk fields
    entryEl.value = result.entry;
    slEl.value = result.stop_loss;

    calcLot();
    drawLines(result.entry, result.stop_loss, result.take_profit);
  };

  // -------- Risk calc --------
  function calcLot() {
    const balance = Number(bal.value || 0);
    const riskPct = Number(risk.value || 0);
    const entry = Number(entryEl.value || 0);
    const sl = Number(slEl.value || 0);

    if (!balance || !riskPct || !entry || !sl) {
      riskOut.textContent = "—";
      return;
    }

    const dist = Math.abs(entry - sl);
    const riskUsd = balance * (riskPct / 100);
    const contract = CONTRACT[pair.value] || 100;

    const lot = riskUsd / (dist * contract);
    riskOut.textContent = lot.toFixed(2) + " lot";
  }

  btnCalc.onclick = calcLot;

  // -------- Chart --------
  let chart, series;
  let plE, plSL, plTP;

  function initChart() {
    if (chart) return;

    chart = LightweightCharts.createChart($("chart"), {
      height: 380,
      layout: { background: { color: "#0b0f14" }, textColor: "#e5e7eb" },
      grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } }
    });

    series = chart.addLineSeries();
    series.setData([]);
  }

  function clearLines() {
    if (!series) return;
    if (plE) series.removePriceLine(plE);
    if (plSL) series.removePriceLine(plSL);
    if (plTP) series.removePriceLine(plTP);
  }

  function drawLines(e, sl, tp) {
    initChart();
    clearLines();

    plE = series.createPriceLine({ price: e, color: "green", title: "ENTRY" });
    plSL = series.createPriceLine({ price: sl, color: "red", title: "SL" });
    plTP = series.createPriceLine({ price: tp, color: "lime", title: "TP" });
  }
});
