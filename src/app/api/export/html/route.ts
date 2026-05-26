import { NextResponse } from "next/server";
import { getAllPois, getAllEdges, getAllDays, getProjectMeta } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import { formatDistance, formatDuration } from "@/lib/geo";
import type { POI, Edge, Day } from "@/types";
import { TRANSPORT_LABELS, POI_TAG_COLORS } from "@/types";

const DC = ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#06b6d4","#84cc16","#f97316","#6366f1"];
const AK = "845e62b164ef5f9f6cf9b26a98f3cd4a";
const AS = "fcbdbb9b1e5d1409235e80f665996ba4";

function esc(s: string): string { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function js(v: unknown): string { return JSON.stringify(v).replace(/</g,"\\u003c"); }

function build(meta: { name: string; description: string }, pois: POI[], edges: Edge[], days: Day[]): string {
  const now = new Date().toLocaleDateString("zh-CN");

  const poiTable = pois.map((p,i) =>
    `<tr><td style="padding:2px 8px;font-size:12px">${i+1}. ${esc(p.name)}</td><td style="font-size:11px;color:#666">${esc(p.address)}</td><td>${p.tag==="hotel"?"🏨":p.tag==="restaurant"?"🍽":"📍"}</td></tr>`
  ).join("");

  let daysHtml = "";
  days.forEach((day,di) => {
    const c = DC[di%DC.length];
    const items = [...day.items].sort((a,b)=>a.order-b.order);
    let td=0,tt=0,dd=0;
    items.forEach(it=>{
      if(!it.fromEdgeId)return;
      const e=edges.find(x=>x.id===it.fromEdgeId);if(!e)return;
      const rs=e.drivingRoutes.length?e.drivingRoutes:e.cyclingRoutes.length?e.cyclingRoutes:e.walkingRoutes;
      const r=rs[e.selectedRouteIndex]||rs[0];
      if(r){td+=r.distance;tt+=r.duration;if(e.transportMode==="driving")dd+=r.distance;}
      else if(e.customRoute){td+=e.customRoute.distance;tt+=e.customRoute.duration;}
    });
    let tl="",ct="08:00";
    const am=(t:string,m:number)=>{const[a,b]=t.split(":").map(Number);const x=a*60+b+m;return String(Math.floor(x/60)%24).padStart(2,"0")+":"+String(x%60).padStart(2,"0")};
    items.forEach((it,idx)=>{
      const poi=pois.find(p=>p.id===it.poiId);
      const sm=(it.stayDuration?.hours||0)*60+(it.stayDuration?.minutes||0);
      tl+=`<tr><td style="padding:3px 8px;font-size:11px;font-family:monospace">${ct}</td><td style="padding:3px 8px;font-size:11px">${idx+1}. ${esc(poi?.name||"?")}</td><td style="padding:3px 8px;font-size:10px;color:#666">${sm>0?`停留${Math.floor(sm/60)}h${sm%60}m`:"-"}</td></tr>`;
      if(sm>0)ct=am(ct,sm);
      if(idx<items.length-1&&items[idx+1]?.fromEdgeId){
        const e=edges.find(x=>x.id===items[idx+1].fromEdgeId);if(!e)return;
        const rs=e.drivingRoutes.length?e.drivingRoutes:e.cyclingRoutes.length?e.cyclingRoutes:e.walkingRoutes;
        const r=rs[e.selectedRouteIndex]||rs[0];
        const dur=r?.duration||e.customRoute?.duration||0,dist=r?.distance||e.customRoute?.distance||0;
        if(dur>0)ct=am(ct,Math.round(dur/60));
        const np=pois.find(p=>p.id===items[idx+1].poiId);
        tl+=`<tr><td></td><td style="padding:2px 8px;font-size:10px;color:#999;border-left:2px dashed ${c}">↓ ${TRANSPORT_LABELS[e.transportMode]||e.transportMode} · ${formatDistance(dist)} · ${formatDuration(dur)} → ${esc(np?.name||"?")}</td><td></td></tr>`;
      }
    });
    daysHtml+=`
<div class="day-page">
  <h2 style="color:${c};border-bottom:3px solid ${c};padding-bottom:6px">${esc(day.label||`Day ${day.dayNumber}`)}</h2>
  <div style="display:flex;gap:16px;margin:12px 0;flex-wrap:wrap">
    <div style="flex:1;min-width:180px">
      <div style="background:#f8f8f8;border-radius:8px;padding:12px">
        <h4 style="margin:0 0 8px 0;font-size:13px">📊 行程统计</h4>
        <table style="width:100%;font-size:11px">
          <tr><td style="padding:2px 0">总里程</td><td style="text-align:right;font-weight:bold">${formatDistance(td)}</td></tr>
          <tr><td style="padding:2px 0">驾车里程</td><td style="text-align:right">${formatDistance(dd)}</td></tr>
          <tr><td style="padding:2px 0">总耗时</td><td style="text-align:right;font-weight:bold">${formatDuration(tt)}</td></tr>
          <tr><td style="padding:2px 0">POI 数量</td><td style="text-align:right">${items.length}</td></tr>
        </table>
      </div>
    </div>
  </div>
  <h4 style="margin:12px 0 4px 0;font-size:13px">⏱ 时间线</h4>
  <table style="width:100%;border-collapse:collapse;margin-bottom:12px">${tl}</table>
  ${day.notesContent?`<div style="background:#fffbe6;border:1px solid #ffe58f;border-radius:6px;padding:10px"><h4 style="margin:0 0 4px 0;font-size:12px">📝 备注</h4><div style="font-size:11px">${day.notesContent}</div></div>`:""}
</div>`;
  });

  const script = `
var PD=${js(pois.map(p=>({id:p.id,n:p.name,x:p.lng,y:p.lat,t:p.tag})))};
var ED=${js(edges.map(e=>{var rs=e.drivingRoutes.length?e.drivingRoutes:e.cyclingRoutes.length?e.cyclingRoutes:e.walkingRoutes;var r=rs[e.selectedRouteIndex]||rs[0];return{id:e.id,o:e.originId,d:e.destinationId,pl:r?.polyline||(e.customRoute?.polyline||[])}}))};
var DD=${js(days.map(d=>({items:[...d.items].sort((a,b)=>a.order-b.order).map(it=>({p:it.poiId,e:it.fromEdgeId}))})))};
var DC=${js(DC)};var TC=${js(POI_TAG_COLORS)};
function w(fn){if(window.AMap&&window.AMap.Map)return fn();var n=0;var t=setInterval(function(){if(window.AMap&&window.AMap.Map){clearInterval(t);fn()}else if(++n>100)clearInterval(t)},200)}
function pb(id){for(var i=0;i<PD.length;i++)if(PD[i].id===id)return PD[i];return null}
function eb(id){for(var i=0;i<ED.length;i++)if(ED[i].id===id)return ED[i];return null}
w(function(){
  var ov=document.getElementById("overview-map");if(!ov)return;
  var om=new AMap.Map("overview-map",{zoom:5,center:[104,35],viewMode:"2D"});
  var ap=[];

  // Which POIs appear in which days
  var pd={}; DD.forEach(function(d,di){d.items.forEach(function(it){if(!pd[it.p])pd[it.p]=[];if(pd[it.p].indexOf(di)<0)pd[it.p].push(di)})});

  // POI markers with day-colored borders and day-number labels
  PD.forEach(function(p,i){
    var dis=pd[p.id]||[],hd=dis.length>0;
    var c=TC[p.t]||"#3b82f6",lbl=hd?'D'+(dis[0]+1):'',bc=hd?DC[dis[0]%DC.length]:'#ccc';
    var h='<div style="background:'+c+';color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:bold;box-shadow:0 1px 4px rgba(0,0,0,.3);border:2px solid '+bc+'">'+lbl+'</div><div style="font-size:9px;color:#333;text-align:center;white-space:nowrap;margin-top:1px;text-shadow:0 0 2px #fff">'+p.n+'</div>';
    new AMap.Marker({position:[p.x,p.y],content:h,offset:new AMap.Pixel(-11,-30),map:om,zIndex:hd?110:100});
    ap.push([p.x,p.y]);
  });

  // Day-colored route segments
  DD.forEach(function(d,di){var c=DC[di%DC.length];d.items.forEach(function(it,idx){if(idx>0&&it.e){var e=eb(it.e);if(e&&e.pl&&e.pl.length>=2){new AMap.Polyline({path:e.pl,strokeColor:c,strokeWeight:5,strokeOpacity:.7,map:om,zIndex:55});ap=ap.concat(e.pl)}}})});

  // Unused edges in gray dashed
  var ue={};DD.forEach(function(d){d.items.forEach(function(it){if(it.e)ue[it.e]=1})});
  ED.forEach(function(e){if(!ue[e.id]&&e.pl&&e.pl.length>=2){new AMap.Polyline({path:e.pl,strokeColor:"#ccc",strokeWeight:2,strokeOpacity:.4,map:om,strokeStyle:"dashed",zIndex:40})}});

  // Legend
  var lg='<div style="position:absolute;bottom:8px;left:8px;background:rgba(255,255,255,.92);padding:6px 10px;border-radius:6px;font-size:10px;box-shadow:0 1px 4px rgba(0,0,0,.12);z-index:200">';
  DD.forEach(function(d,di){lg+='<div style="display:flex;align-items:center;gap:4px;margin:2px 0"><span style="display:inline-block;width:16px;height:4px;background:'+DC[di%DC.length]+';border-radius:2px"></span>Day '+(di+1)+(d.items.length?' ('+d.items.length+' POI)':'')+'</div>'});
  lg+='<div style="display:flex;align-items:center;gap:4px;margin:2px 0;margin-top:4px;border-top:1px solid #eee;padding-top:4px"><span style="display:inline-block;width:16px;height:2px;background:#ccc;border-radius:1px;border-top:1px dashed #ccc"></span> 未排入日程</div>';
  lg+='</div>';var ld=document.createElement('div');ld.innerHTML=lg;ov.appendChild(ld);

  if(ap.length>0)om.setFitView(null,false,[40,40,40,40]);
});`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(meta.name)} - Travectory</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#333;line-height:1.5;max-width:960px;margin:0 auto;padding:20px;background:#f5f5f5}
.cover{text-align:center;padding:60px 20px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:12px;margin-bottom:24px}
.cover h1{font-size:32px;margin-bottom:8px}
.cover .stats{display:flex;justify-content:center;gap:32px;margin-top:16px;font-size:14px;opacity:.9;flex-wrap:wrap}
.section{background:#fff;border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.section h2{font-size:18px;margin-bottom:12px}
.day-page{background:#fff;border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,.06);page-break-before:always}
.day-page:first-of-type{page-break-before:avoid}
#overview-map{width:100%;height:500px;border-radius:8px;position:relative}
@media print{body{background:#fff;padding:0;max-width:100%}.day-page,.section{box-shadow:none;border:1px solid #eee;break-inside:avoid}}
</style>
</head>
<body>
<div class="cover"><h1>${esc(meta.name)}</h1><p>${esc(meta.description)}</p><div class="stats"><span>📌 ${pois.length} POI</span><span>🛣 ${edges.length} 路线</span><span>📅 ${days.length} 天</span><span>📆 ${now}</span></div></div>
<div class="section"><h2>📍 POI 节点 (${pois.length})</h2><table style="width:100%;border-collapse:collapse">${poiTable}</table></div>
<div class="section"><h2>🗺 总览地图</h2><div id="overview-map"></div></div>
<div class="section"><h2>📅 日程详情</h2></div>
${daysHtml}
<footer style="text-align:center;padding:20px;color:#999;font-size:11px">由 Travectory 生成 · ${now}</footer>
<script>window._AMapSecurityConfig={securityJsCode:"${AS}"};</script>
<script src="https://webapi.amap.com/maps?v=2.0&key=${AK}&plugin=AMap.Marker,AMap.Polyline,AMap.Pixel"></script>
<script>${script}</script>
</body>
</html>`;
}

export const GET = withUser(async () => {
  try {
    const meta = getProjectMeta();
    const html = build(meta, getAllPois(), getAllEdges(), getAllDays());
    const sn = encodeURIComponent(meta.name || "roadbook");
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${sn}.html`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
