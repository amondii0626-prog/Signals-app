const resultBox = document.getElementById("result");

function setResult(text) {
  resultBox.textContent = text;
}

function saveBackend() {
  const url = document.getElementById("backendUrl").value.trim().replace(/\/$/, "");
  if (!url) {
    alert("Backend URL оруулна уу");
    return;
  }
  localStorage.setItem("backendUrl", url);
  setResult("✅ Backend saved:\n" + url);
}

function loadSavedBackend() {
  const saved = localStorage.getItem("backendUrl");
  if (saved) {
    document.getElementById("backendUrl").value = saved;
    setResult("✅ Loaded backend:\n" + saved);
  }
}

async function analyze() {
  const baseUrl =
    document.getElementById("backendUrl").value.trim().replace(/\/$/, "") ||
    localStorage.getItem("backendUrl");

  if (!baseUrl) {
    alert("Backend URL оруулаад Load дарна уу");
    return;
  }

  const symbol = document.getElementById("symbol").value;
  const tf = document.getElementById("timeframe").value;

  const url = `${baseUrl}/analyze?symbol=${symbol}&tf=${tf}`;

  try {
    setResult("⏳ Analyzing...\n" + url);
    const res = await fetch(url);
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
  } catch (err) {
    setResult("❌ ERROR:\n" + err.message);
  }
}

window.onload = loadSavedBackend;
