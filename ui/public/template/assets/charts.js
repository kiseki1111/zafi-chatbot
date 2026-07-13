/* =========================================================================
   PropertiKu Agent — Template UI · charts.js
   Chart.js helpers — guard against re-render by destroying prior instances.
   ========================================================================= */

const PIE_COLORS = ["#059669","#14b8a6","#f59e0b","#8b5cf6","#f43f5e"];
const _pkCharts = {};

function _destroy(id){ if(_pkCharts[id]){ try{ _pkCharts[id].destroy(); }catch(e){} delete _pkCharts[id]; } }

function _gridColor(){ return getComputedStyle(document.documentElement).getPropertyValue("--border").trim() ? "hsl(var(--border))" : "rgba(0,0,0,.08)"; }
function _cardColor(){ return getComputedStyle(document.documentElement).getPropertyValue("--card").trim() ? "hsl(var(--card))" : "#fff"; }
function _mutedFg(){ return getComputedStyle(document.documentElement).getPropertyValue("--muted-foreground").trim() ? "hsl(var(--muted-foreground))" : "rgba(0,0,0,.5)"; }

/* Revenue area chart: emerald gradient + teal target line. data = [{label,value,value2}] */
function revenueAreaChart(canvasId, data){
  const c = document.getElementById(canvasId);
  if(!c || !window.Chart) return;
  _destroy(canvasId);
  _pkCharts[canvasId] = new Chart(c, {
    type:"line",
    data:{ labels:data.map(d=>d.label), datasets:[
      { label:"Pendapatan", data:data.map(d=>d.value), borderColor:"#059669",
        backgroundColor:(ctx)=>{ const cc=ctx.chart.ctx; const g=cc.createLinearGradient(0,0,0,260); g.addColorStop(0,"rgba(5,150,105,.35)"); g.addColorStop(1,"rgba(5,150,105,0)"); return g; },
        fill:true, tension:.4, borderWidth:2, pointRadius:3, pointBackgroundColor:"#059669" },
      { label:"Target", data:data.map(d=>d.value2), borderColor:"#14b8a6", borderDash:[6,4], fill:false, tension:.4, borderWidth:2, pointRadius:0 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:true,position:"bottom",labels:{font:{size:11},usePointStyle:true,pointStyle:"circle"}} },
      scales:{ x:{grid:{display:false},ticks:{color:_mutedFg(),font:{size:11}}}, y:{grid:{color:_gridColor()},ticks:{color:_mutedFg(),font:{size:11}}} }
    }
  });
}

/* Lead source donut: PIE_COLORS */
function leadSourceDonut(canvasId, data){
  const c = document.getElementById(canvasId);
  if(!c || !window.Chart) return;
  _destroy(canvasId);
  _pkCharts[canvasId] = new Chart(c, {
    type:"doughnut",
    data:{ labels:data.map(d=>d.label), datasets:[{ data:data.map(d=>d.value), backgroundColor:PIE_COLORS, borderWidth:2, borderColor:_cardColor() }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:"62%",
      plugins:{ legend:{position:"bottom",labels:{font:{size:11},usePointStyle:true,pointStyle:"circle",padding:12,color:_mutedFg()}} } }
  });
}

/* Finance bar chart: emerald gradient */
function financeBarChart(canvasId, data){
  const c = document.getElementById(canvasId);
  if(!c || !window.Chart) return;
  _destroy(canvasId);
  _pkCharts[canvasId] = new Chart(c, {
    type:"bar",
    data:{ labels:data.map(d=>d.label), datasets:[
      { label:"Pendapatan", data:data.map(d=>d.value),
        backgroundColor:(ctx)=>{ const cc=ctx.chart.ctx; const g=cc.createLinearGradient(0,0,0,240); g.addColorStop(0,"rgba(5,150,105,.9)"); g.addColorStop(1,"rgba(20,184,166,.5)"); return g; },
        borderRadius:6, maxBarThickness:36 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{ x:{grid:{display:false},ticks:{color:_mutedFg(),font:{size:11}}}, y:{grid:{color:_gridColor()},ticks:{color:_mutedFg(),font:{size:11}}} }
    }
  });
}

/* Invoice status donut: 4 colors */
function invoiceStatusDonut(canvasId, counts){
  const c = document.getElementById(canvasId);
  if(!c || !window.Chart) return;
  _destroy(canvasId);
  _pkCharts[canvasId] = new Chart(c, {
    type:"doughnut",
    data:{ labels:["Lunas","Belum Bayar","Jatuh Tempo","Dibatalkan"],
      datasets:[{ data:[counts.lunas||0, counts["belum-bayar"]||0, counts["jatuh-tempo"]||0, counts.dibatalkan||0],
        backgroundColor:["#059669","#f59e0b","#f43f5e","#71717a"], borderWidth:2, borderColor:_cardColor() }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:"60%",
      plugins:{legend:{position:"bottom",labels:{font:{size:10},usePointStyle:true,pointStyle:"circle",padding:8,color:_mutedFg()}}} }
  });
}

/* Read vs replied bar (marketing) */
function campaignBarChart(canvasId, data){
  const c = document.getElementById(canvasId);
  if(!c || !window.Chart) return;
  _destroy(canvasId);
  _pkCharts[canvasId] = new Chart(c, {
    type:"bar",
    data:{ labels:data.map(d=>d.label), datasets:[
      { label:"Dibaca",  data:data.map(d=>d.read),    backgroundColor:"#14b8a6", borderRadius:4, maxBarThickness:28 },
      { label:"Dibalas", data:data.map(d=>d.replied), backgroundColor:"#ec4899", borderRadius:4, maxBarThickness:28 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{position:"bottom",labels:{font:{size:10},usePointStyle:true,pointStyle:"circle",color:_mutedFg()}}},
      scales:{ x:{grid:{display:false},ticks:{color:_mutedFg(),font:{size:10}}}, y:{grid:{color:_gridColor()},ticks:{color:_mutedFg(),font:{size:10}}} }
    }
  });
}

Object.assign(window, {
  revenueAreaChart, leadSourceDonut, financeBarChart, invoiceStatusDonut, campaignBarChart,
});
