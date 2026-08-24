"use client";

import { useMemo, useState } from "react";
import { Bike, Car, ChevronRight, Footprints, Plane, Plus, Ship, Train, Trash2, X } from "lucide-react";
import { mobileEdgeApi } from "../lib/local-api";
import { calculateAmapRoutes } from "../lib/amap-browser";
import type { Edge, Poi, RoutePath } from "../types";

const modes = { driving: "驾车", cycling: "骑行", walking: "步行", train: "火车", flight: "飞机", ferry: "轮渡" } as const;
type Mode = keyof typeof modes;
const icons = { driving: Car, cycling: Bike, walking: Footprints, train: Train, flight: Plane, ferry: Ship };
const strategies: Record<string, string> = { "0": "最快路线", "2": "最短距离", "1": "避免收费", "3": "不走高速", "5": "不走高速且避免收费", "4": "躲避拥堵" };

export function MobileEdgeManager({ edges, pois, userId, projectId, onChanged }: { edges: Edge[]; pois: Poi[]; userId: string; projectId: string; onChanged: () => Promise<void> }) {
  const [mode, setMode] = useState<Mode | "all">("all");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Edge | null>(null);
  const poiById = useMemo(() => new Map(pois.map((poi) => [poi.id, poi])), [pois]);
  const filtered = mode === "all" ? edges : edges.filter((edge) => edge.transportMode === mode);
  return <section className="edge-manager"><div className="edge-head"><div><b>路线边</b><small>{edges.length} 条已保存路线</small></div><button onClick={() => setAdding(true)}><Plus size={17} />添加路线</button></div><div className="edge-filter"><button className={mode === "all" ? "active" : ""} onClick={() => setMode("all")}>全部</button>{(Object.keys(modes) as Mode[]).map((value) => <button key={value} className={mode === value ? "active" : ""} onClick={() => setMode(value)}>{modes[value]}</button>)}</div><div className="edge-list">{filtered.map((edge) => { const Icon = icons[edge.transportMode as Mode] || Car; const metric = edgeMetric(edge); return <button key={edge.id} onClick={() => setSelected(edge)}><span className="edge-mode-icon"><Icon size={19} /></span><span><b>{poiById.get(edge.originId)?.name || "未知地点"} <i>→</i> {poiById.get(edge.destinationId)?.name || "未知地点"}</b><small>{modes[edge.transportMode as Mode] || edge.transportMode}{metric ? ` · ${formatDistance(metric.distance)} · ${formatDuration(metric.duration)}` : " · 未计算路线"}</small></span><ChevronRight size={18} /></button>; })}{!filtered.length && <div className="edge-empty"><Car size={35} /><b>暂无路线</b><span>点击“添加路线”连接两个 POI</span></div>}</div>{adding && <EdgeEditor pois={pois} userId={userId} projectId={projectId} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await onChanged(); }} />}{selected && <EdgeDetail edge={selected} pois={pois} userId={userId} projectId={projectId} onClose={() => setSelected(null)} onChanged={async () => { setSelected(null); await onChanged(); }} />}</section>;
}

export function EdgeEditor({ pois, userId, projectId, onClose, onSaved, onPreviewRoute }: { pois: Poi[]; userId: string; projectId: string; onClose: () => void; onSaved: () => Promise<void>; onPreviewRoute?: (route: RoutePath | null) => void }) {
  const [originId, setOriginId] = useState(""); const [destinationId, setDestinationId] = useState("");
  const [mode, setMode] = useState<Mode>("driving"); const [custom, setCustom] = useState(false);
  const [customDistance, setCustomDistance] = useState(""); const [customDuration, setCustomDuration] = useState(""); const [customName, setCustomName] = useState("");
  const [routes, setRoutes] = useState<RoutePath[]>([]); const [selectedRoute, setSelectedRoute] = useState(0); const [working, setWorking] = useState(false); const [error, setError] = useState("");
  const calculate = async () => {
    const origin = pois.find((poi) => poi.id === originId), destination = pois.find((poi) => poi.id === destinationId);
    if (!origin || !destination || !["driving","cycling","walking"].includes(mode)) return;
    setWorking(true); setError(""); setRoutes([]); onPreviewRoute?.(null);
    try {
      if (mode === "driving") {
        const results = await Promise.allSettled(Object.keys(strategies).map((strategy) => calculateAmapRoutes(origin, destination, "driving", strategy)));
        const all = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
        if (!all.length) throw new Error("未获得可用驾车路线");
        setRoutes(all);
        if (all[0]) onPreviewRoute?.(all[0]);
      } else { const calculated = await calculateAmapRoutes(origin, destination, mode as "walking" | "cycling"); setRoutes(calculated); if (calculated[0]) onPreviewRoute?.(calculated[0]); }
      setSelectedRoute(0);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "路线计算失败"); }
    finally { setWorking(false); }
  };
  const save = async () => {
    if (!originId || !destinationId || originId === destinationId) { setError("请选择两个不同的地点"); return; }
    setWorking(true); setError("");
    const origin = pois.find((poi) => poi.id === originId), destination = pois.find((poi) => poi.id === destinationId);
    const selected = routes[selectedRoute];
    const customRoute = custom && origin && destination ? { distance: (Number(customDistance) || 0) * 1000, duration: (Number(customDuration) || 0) * 60, routeName: customName || undefined, polyline: [[origin.lng, origin.lat], [destination.lng, destination.lat]] } : null;
    try { await mobileEdgeApi.create(userId, projectId, { originId, destinationId, transportMode: mode, drivingRoutes: !custom && mode === "driving" && selected ? [selected] : [], cyclingRoutes: !custom && mode === "cycling" && selected ? [selected] : [], walkingRoutes: !custom && mode === "walking" && selected ? [selected] : [], customRoute, selectedRouteIndex: 0 }); onPreviewRoute?.(null); await onSaved(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "保存路线失败"); setWorking(false); }
  };
  const calculatedMode = ["driving","cycling","walking"].includes(mode);
  return <div className="mobile-sheet-backdrop" onClick={()=>{onPreviewRoute?.(null);onClose();}}><div className="mobile-sheet edge-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle"/><div className="sheet-title"><div><b>添加路线边</b><small>选择方案时会在地图上预览</small></div><button onClick={()=>{onPreviewRoute?.(null);onClose();}}><X size={20}/></button></div><div className="sheet-body"><div className="edge-endpoints"><label>起点<select value={originId} onChange={(event) => { setOriginId(event.target.value); setRoutes([]); onPreviewRoute?.(null); }}><option value="">选择起点</option>{pois.map((poi) => <option key={poi.id} value={poi.id}>{poi.name}</option>)}</select></label><span>→</span><label>终点<select value={destinationId} onChange={(event) => { setDestinationId(event.target.value); setRoutes([]); onPreviewRoute?.(null); }}><option value="">选择终点</option>{pois.map((poi) => <option key={poi.id} value={poi.id}>{poi.name}</option>)}</select></label></div><label>交通方式<div className="mode-grid">{(Object.keys(modes) as Mode[]).map((value) => { const Icon = icons[value]; return <button key={value} className={mode === value ? "active" : ""} onClick={() => { setMode(value); setRoutes([]); onPreviewRoute?.(null); setCustom(!["driving","cycling","walking"].includes(value)); }}><Icon size={17}/>{modes[value]}</button>; })}</div></label>{calculatedMode && <label className="custom-toggle"><input type="checkbox" checked={custom} onChange={(event) => {setCustom(event.target.checked);onPreviewRoute?.(null);}}/>使用自定义里程和时间</label>}{custom ? <div className="custom-route-fields"><label>路线名称<input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="如 G318、夜间火车"/></label><label>里程（公里）<input inputMode="decimal" value={customDistance} onChange={(event) => setCustomDistance(event.target.value)}/></label><label>时间（分钟）<input inputMode="numeric" value={customDuration} onChange={(event) => setCustomDuration(event.target.value)}/></label></div> : calculatedMode && <><button className="calculate-route" onClick={() => void calculate()} disabled={!originId || !destinationId || working}>{working ? "计算中..." : mode === "driving" ? "计算全部驾车方案" : `计算${modes[mode]}路线`}</button>{routes.length > 0 && <div className="route-options">{routes.map((route,index) => <button key={index} className={selectedRoute === index ? "active" : ""} onClick={() => {setSelectedRoute(index);onPreviewRoute?.(route);}}><span><b>{mode === "driving" ? strategies[route.strategy || "0"] || "驾车路线" : `${modes[mode]}路线`} #{index + 1}</b><small>{formatDistance(route.distance)} · {formatDuration(route.duration)}{route.tolls > 0 ? ` · ¥${route.tolls}` : ""}</small></span>{selectedRoute === index && <i>预览中</i>}</button>)}</div>}</>}{error && <div className="sheet-error">{error}</div>}</div><div className="sheet-actions"><button className="save" onClick={() => void save()} disabled={working || !originId || !destinationId || (!custom && calculatedMode && !routes.length)}>{working ? "处理中..." : "保存路线"}</button></div></div></div>;
}

function EdgeDetail({ edge, pois, userId, projectId, onClose, onChanged }: { edge: Edge; pois: Poi[]; userId: string; projectId: string; onClose: () => void; onChanged: () => Promise<void> }) {
  const origin = pois.find((poi) => poi.id === edge.originId), destination = pois.find((poi) => poi.id === edge.destinationId); const metric = edgeMetric(edge); const Icon = icons[edge.transportMode as Mode] || Car; const [deleting,setDeleting] = useState(false);
  const remove = async () => { if (!confirm("确定删除这条路线边吗？")) return; setDeleting(true); try { await mobileEdgeApi.delete(userId,projectId,edge.id); await onChanged(); } catch { setDeleting(false); } };
  return <div className="mobile-sheet-backdrop" onClick={onClose}><div className="mobile-sheet edge-detail-sheet" onClick={(event)=>event.stopPropagation()}><div className="sheet-handle"/><div className="sheet-title"><div><b>路线详情</b><small>{modes[edge.transportMode as Mode] || edge.transportMode}</small></div><button onClick={onClose}><X size={20}/></button></div><div className="edge-detail-body"><span className="edge-detail-icon"><Icon size={25}/></span><h3>{origin?.name || "未知地点"}<i>→</i>{destination?.name || "未知地点"}</h3>{edge.customRoute?.routeName && <p>{edge.customRoute.routeName}</p>}<div><span><b>{metric ? formatDistance(metric.distance) : "--"}</b><small>路线里程</small></span><span><b>{metric ? formatDuration(metric.duration) : "--"}</b><small>预计耗时</small></span><span><b>{metric?.tolls ? `¥${metric.tolls}` : "--"}</b><small>过路费</small></span></div></div><div className="sheet-actions"><button className="delete" onClick={() => void remove()} disabled={deleting}><Trash2 size={17}/>{deleting ? "删除中" : "删除路线"}</button><button className="save" onClick={onClose}>关闭</button></div></div></div>;
}

function edgeMetric(edge: Edge): { distance: number; duration: number; tolls: number } | null { if (edge.customRoute) return { ...edge.customRoute, tolls: 0 }; const routes = edge.drivingRoutes?.length ? edge.drivingRoutes : edge.cyclingRoutes?.length ? edge.cyclingRoutes : edge.walkingRoutes || []; return routes[edge.selectedRouteIndex] || routes[0] || null; }
function formatDistance(value: number) { return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`; }
function formatDuration(value: number) { const minutes = Math.round(value / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)}小时${minutes % 60}分` : `${minutes}分钟`; }
