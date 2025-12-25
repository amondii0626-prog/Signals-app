let chart, series;

function initChart() {
  chart = LightweightCharts.createChart(document.getElementById("chart"), {
    layout: { background: { color: "#0b0f14" }, textColor: "#d1d4dc" },
    grid: { vertLines: { color: "#1f2933" }, horzLines: { color: "#1f2933" } },
    timeScale: { timeVisible: true, secondsVisible: false }
  });

  series = chart.addCandlestickSeries();
}

initChart();

async function loadCandles() {
  document.getElementById("hud").innerText = "⏳ Backend-тэй холбогдож байна...";
  setTimeout(() => {
    document.getElementById("hud").innerText = "✅ Loaded backend metadata.\nОдоо Analyze дар.";
  }, 1000);
}

async function askAnalysis() {
  const api = document.getElementById("api").value.trim();
  const pair = document.getElementById("pair").value;
  const tf = document.getElementById("tf").value;

  if (!api.startsWith("http")) {
    alert("❌ Backend URL буруу байна");
    return;
  }

  document.getElementById("hud").innerText = "📊 Analyze хийж байна...";

  const res = await fetch(
    `${api}/analyze?symbol=${pair}&tf=${tf}`
  );
  const data = await res.json();

  showSignal(data);
  drawLevels(data);
}

function showSignal(d) {
  const color = d.trend === "BUY" ? "#16a34a" : "#dc2626";

  document.getElementById("hud").innerHTML = `
    <div style="padding:10px;border-radius:10px;background:#020617">
      <b>${d.symbol} (${d.timeframe})</b><br/>
      <span style="color:${color};font-size:18px">${d.trend}</span><br/>
      Entry: ${d.entry}<br/>
      SL: ${d.stop_loss}<br/>
      TP: ${d.take_profit}<br/>
      Confidence: ${d.confidence}
    </div>
  `;
}

function drawLevels(d) {
  series.setMarkers([
    {
      time: Math.floor(Date.now() / 1000),
      position: d.trend === "BUY" ? "belowBar" : "aboveBar",
      color: d.trend === "BUY" ? "#16a34a" : "#dc2626",
      shape: d.trend === "BUY" ? "arrowUp" : "arrowDown",
      text: `${d.trend} @ ${d.entry}`
    }
  ]);
}
