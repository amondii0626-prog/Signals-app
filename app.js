const hud = document.getElementById("hud");
const canvas = document.getElementById("draw");
const ctx = canvas.getContext("2d");
const wrap = document.getElementById("wrap");

const chart = LightweightCharts.createChart(
  document.getElementById("chart"),
  { layout:{background:{color:"#0b0f14"},textColor:"#d7e1ee"} }
);
const candleSeries = chart.addCandlestickSeries();

let tool="line", drawing=[], current=null;

function resize(){
  const r=wrap.getBoundingClientRect();
  canvas.width=r.width; canvas.height=r.height;
  chart.applyOptions({width:r.width,height:r.height});
  render();
}
window.addEventListener("resize",resize);

function setTool(t){tool=t; hud.textContent="Tool: "+t;}
function pos(e){const r=wrap.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top};}
function draw(o){
  ctx.strokeStyle="#7cc8ff"; ctx.lineWidth=2;
  if(o.type==="line"){ctx.beginPath();ctx.moveTo(o.a.x,o.a.y);ctx.lineTo(o.b.x,o.b.y);ctx.stroke();}
  if(o.type==="rect"){ctx.strokeRect(o.a.x,o.a.y,o.b.x-o.a.x,o.b.y-o.a.y);}
  if(o.type==="text"){ctx.fillStyle="#fff";ctx.fillText(o.text,o.a.x,o.a.y);}
}
function render(extra){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawing.forEach(draw); if(extra) draw(extra);
}

canvas.onpointerdown=e=>{
  const p=pos(e);
  if(tool==="text"){drawing.push({type:"text",a:p,text:prompt("Text")||""});render();return;}
  current={type:tool,a:p,b:p};
};
canvas.onpointermove=e=>{if(!current)return; current.b=pos(e); render(current);};
canvas.onpointerup=()=>{if(current){drawing.push(current); current=null; render();}};

function undo(){drawing.pop();render();}

async function loadCandles(){
  const api=document.getElementById("api").value;
  if(!api){alert("Backend URL дараа оруулна");return;}
  const pair=document.getElementById("pair").value;
  const tf=document.getElementById("tf").value;
  const r=await fetch(`${api}/candles?pair=${pair}&tf=${tf}`);
  const d=await r.json();
  candleSeries.setData(d.candles);
  chart.timeScale().fitContent();
}
function askAnalysis(){alert("Backend дараагийн алхамд холбоно");}

resize();
