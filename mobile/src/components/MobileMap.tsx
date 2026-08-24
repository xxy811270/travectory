"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers3, LocateFixed, MapPin, Navigation, Plus, Route as RouteIcon, Search, X } from "lucide-react";
import { searchAmapPois } from "../lib/amap-browser";
import type { AmapPoiResult, Day, Edge, Poi, RoutePath } from "../types";
import { EdgeEditor } from "./MobileEdgeManager";

const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_JS_KEY || "";
const AMAP_SECRET = process.env.NEXT_PUBLIC_AMAP_SECRET || "";
const DAY_COLORS = ["#3157d5", "#e45858", "#17a67a", "#e49a28", "#8a62d3", "#0e91b7", "#d761a1", "#6b7c35"];
const PLUGINS = "AMap.Marker,AMap.Polyline,AMap.Pixel,AMap.Bounds,AMap.PlaceSearch,AMap.Geocoder";

export function MobileMap({ days, pois, edges, userId, projectId, onAddPoi, onDataChanged }: { days: Day[]; pois: Poi[]; edges: Edge[]; userId: string; projectId: string; onAddPoi?: (poi: { lng: number; lat: number; name?: string; address?: string; phone?: string; amapPoiId?: string }) => void; onDataChanged?: () => Promise<void> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const locationMarkerRef = useRef<any>(null);
  const searchMarkerRef = useRef<any>(null);
  const satelliteLayersRef = useRef<any[]>([]);
  const routePreviewRef = useRef<any>(null);
  const initialViewHandledRef = useRef(false);
  const restoredViewRef = useRef(false);
  const lastDayFilterRef = useRef<number | "all">("all");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [dayFilter, setDayFilter] = useState<number | "all">("all");
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [locating, setLocating] = useState(false);
  const [pickingPoi, setPickingPoi] = useState(false);
  const [mapQuery, setMapQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AmapPoiResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [previewResult, setPreviewResult] = useState<AmapPoiResult | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [showPois, setShowPois] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showDistances, setShowDistances] = useState(false);
  const [showEdgeEditor, setShowEdgeEditor] = useState(false);
  const [previewRoute, setPreviewRoute] = useState<RoutePath | null>(null);
  const poiById = useMemo(() => new Map(pois.map((poi) => [poi.id, poi])), [pois]);
  const edgeById = useMemo(() => new Map(edges.map((edge) => [edge.id, edge])), [edges]);

  useEffect(() => {
    let active = true;
    if (!AMAP_KEY) { setError("移动端未读取到高德地图 JS Key"); return; }
    const createMap = () => {
      if (!active || !containerRef.current || !window.AMap || mapRef.current) return;
      let remembered: { center?: [number, number]; zoom?: number } | null = null;
      try { remembered = JSON.parse(localStorage.getItem(`travectory_mobile_map_${projectId}`) || "null"); } catch { /* ignore invalid memory */ }
      restoredViewRef.current = Boolean(remembered?.center && remembered?.zoom);
      mapRef.current = new window.AMap.Map(containerRef.current, {
        zoom: remembered?.zoom || 5,
        center: remembered?.center || [105.5, 35.5],
        viewMode: "2D",
        mapStyle: "amap://styles/whitesmoke",
        showLabel: true,
      });
      const rememberView = () => {
        const center = mapRef.current?.getCenter?.();
        const zoom = mapRef.current?.getZoom?.();
        if (center && Number.isFinite(zoom)) localStorage.setItem(`travectory_mobile_map_${projectId}`, JSON.stringify({ center: [center.lng, center.lat], zoom }));
      };
      mapRef.current.on?.("moveend", rememberView);
      mapRef.current.on?.("zoomend", rememberView);
      setReady(true);
    };
    if (window.AMap?.Map) { createMap(); return () => { active = false; }; }

    window._AMapSecurityConfig = { securityJsCode: AMAP_SECRET };
    const scriptId = "travectory-mobile-amap";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=${encodeURIComponent(PLUGINS)}`;
      document.head.appendChild(script);
    }
    script.addEventListener("load", createMap);
    script.addEventListener("error", () => active && setError("高德地图加载失败，请检查网络或 Key 配置"), { once: true });
    return () => { active = false; script?.removeEventListener("load", createMap); };
  }, [projectId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !window.AMap) return;
    overlaysRef.current.forEach((overlay) => overlay.setMap?.(null));
    overlaysRef.current = [];
    setSelectedPoi(null);

    const visibleDays = dayFilter === "all" ? days : days.filter((day) => day.dayNumber === dayFilter);
    const scheduledPoiIds = new Set(days.flatMap((day) => day.items.map((item) => item.poiId)));
    const scheduledEdgeIds = new Set(days.flatMap((day) => day.items.map((item) => item.fromEdgeId).filter((id): id is string => Boolean(id))));
    const markerPoiIds = new Set<string>();
    const fitTargets: any[] = [];
    visibleDays.forEach((day) => {
      const color = DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length];
      const items = [...day.items].sort((a, b) => a.order - b.order);
      items.forEach((item, itemIndex) => {
        const poi = poiById.get(item.poiId);
        if (showPois && poi && !markerPoiIds.has(poi.id)) {
          markerPoiIds.add(poi.id);
          const marker: any = new window.AMap.Marker({
            position: [poi.lng, poi.lat],
            anchor: "center",
            zIndex: 80,
            content: `<div class="amap-day-marker" style="--marker-color:${color}"><span>${itemIndex + 1}</span></div>`,
            title: poi.name,
          });
          marker.on("click", () => setSelectedPoi(poi));
          marker.setMap(map);
          overlaysRef.current.push(marker);
          fitTargets.push(marker);
        }
        if (!showRoutes || !item.fromEdgeId) return;
        const edge = edgeById.get(item.fromEdgeId);
        const path = edge ? selectedPath(edge) : null;
        if (!path || path.length < 2) return;
        const outline: any = new window.AMap.Polyline({ path, strokeColor: "#ffffff", strokeWeight: 9, strokeOpacity: .75, lineJoin: "round", lineCap: "round", zIndex: 40 });
        const route: any = new window.AMap.Polyline({ path, strokeColor: color, strokeWeight: 5, strokeOpacity: .9, lineJoin: "round", lineCap: "round", zIndex: 41 });
        outline.setMap(map); route.setMap(map);
        overlaysRef.current.push(outline, route);
        fitTargets.push(route);
        if (showDistances) {
          const midpoint = path[Math.floor(path.length / 2)];
          const metric = edgeMetric(edge!);
          if (midpoint && metric) {
            const label: any = new window.AMap.Text({ text: formatMapDistance(metric.distance), position: midpoint, anchor: "center", style: { padding: "3px 7px", border: `1px solid ${color}`, borderRadius: "8px", color, fontSize: "10px", background: "rgba(255,255,255,.94)" }, zIndex: 65 });
            label.setMap(map); overlaysRef.current.push(label);
          }
        }
      });
    });

    if (showPois) pois.filter((poi) => !scheduledPoiIds.has(poi.id)).forEach((poi) => {
      const marker: any = new window.AMap.Marker({ position: [poi.lng, poi.lat], anchor: "center", zIndex: 55, content: '<div class="amap-library-marker"><span></span></div>', title: poi.name });
      marker.on("click", () => setSelectedPoi(poi)); marker.setMap(map); overlaysRef.current.push(marker);
      if (dayFilter === "all") fitTargets.push(marker);
    });
    if (showRoutes) edges.filter((edge) => !scheduledEdgeIds.has(edge.id)).forEach((edge) => {
      const path = selectedPath(edge); if (!path || path.length < 2) return;
      const route: any = new window.AMap.Polyline({ path, strokeColor: "#64748b", strokeWeight: 3, strokeOpacity: .65, strokeStyle: "dashed", lineJoin: "round", lineCap: "round", zIndex: 28 });
      route.setMap(map); overlaysRef.current.push(route); if (dayFilter === "all") fitTargets.push(route);
      if (showDistances) { const midpoint=path[Math.floor(path.length/2)],metric=edgeMetric(edge); if(midpoint&&metric){const label:any=new window.AMap.Text({text:formatMapDistance(metric.distance),position:midpoint,anchor:"center",style:{padding:"3px 7px",border:"1px solid #64748b",borderRadius:"8px",color:"#64748b",fontSize:"10px",background:"rgba(255,255,255,.92)"},zIndex:50});label.setMap(map);overlaysRef.current.push(label);} }
    });
    const filterChanged = lastDayFilterRef.current !== dayFilter;
    if (fitTargets.length && ((!initialViewHandledRef.current && !restoredViewRef.current) || filterChanged)) map.setFitView(fitTargets, false, [120, 34, 150, 34], 14);
    initialViewHandledRef.current = true;
    lastDayFilterRef.current = dayFilter;
  }, [ready, dayFilter, days, poiById, edgeById, showPois, showRoutes, showDistances]);

  useEffect(() => {
    routePreviewRef.current?.setMap?.(null); routePreviewRef.current = null;
    if (!ready || !previewRoute?.polyline?.length || !window.AMap) return;
    const preview: any = new window.AMap.Polyline({ path: previewRoute.polyline, strokeColor: "#f59e0b", strokeWeight: 7, strokeOpacity: .95, lineJoin: "round", lineCap: "round", zIndex: 180 });
    preview.setMap(mapRef.current); routePreviewRef.current = preview;
    return () => preview.setMap?.(null);
  }, [ready, previewRoute]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.AMap) return;
    satelliteLayersRef.current.forEach((layer) => layer.setMap?.(null));
    satelliteLayersRef.current = [];
    if (satellite) {
      const satelliteLayer: any = new window.AMap.TileLayer.Satellite();
      const roadLayer: any = new window.AMap.TileLayer.RoadNet();
      satelliteLayer.setMap(mapRef.current); roadLayer.setMap(mapRef.current);
      satelliteLayersRef.current = [satelliteLayer, roadLayer];
    }
  }, [ready, satellite]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !pickingPoi) return;
    const handleMapClick = (event: any) => {
      const lng = event.lnglat?.getLng?.();
      const lat = event.lnglat?.getLat?.();
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        setPickingPoi(false);
        onAddPoi?.({ lng, lat });
      }
    };
    map.on("click", handleMapClick);
    return () => map.off("click", handleMapClick);
  }, [ready, pickingPoi, onAddPoi]);

  const locate = () => {
    if (!navigator.geolocation || !mapRef.current || !window.AMap) { setError("当前浏览器不支持定位"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      const point = [position.coords.longitude, position.coords.latitude];
      locationMarkerRef.current?.setMap?.(null);
      locationMarkerRef.current = new window.AMap.Marker({
        position: point,
        anchor: "center",
        content: '<div class="my-location"><i></i></div>',
        zIndex: 100,
      });
      locationMarkerRef.current.setMap(mapRef.current);
      mapRef.current.setZoomAndCenter(14, point);
      setLocating(false);
    }, () => { setError("无法获取位置，请允许浏览器使用定位权限"); setLocating(false); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const searchOnMap = async () => {
    if (!mapQuery.trim() || searching) return;
    setSearching(true); setError("");
    try { setSearchResults(await searchAmapPois(mapQuery.trim())); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "搜索失败"); }
    finally { setSearching(false); }
  };

  const chooseSearchResult = (result: AmapPoiResult) => {
    const [lng, lat] = result.location.split(",").map(Number);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    mapRef.current?.setZoomAndCenter?.(15, [lng, lat]);
    searchMarkerRef.current?.setMap?.(null);
    searchMarkerRef.current = new window.AMap.Marker({
      position: [lng, lat], anchor: "bottom-center", zIndex: 120,
      content: '<div class="search-preview-marker"><span></span></div>', title: result.name,
    });
    searchMarkerRef.current.setMap(mapRef.current);
    setSearchResults([]);
    setPreviewResult(result);
  };

  const closePreview = () => {
    searchMarkerRef.current?.setMap?.(null);
    searchMarkerRef.current = null;
    setPreviewResult(null);
  };

  const addPreviewPoi = () => {
    if (!previewResult) return;
    const [lng, lat] = previewResult.location.split(",").map(Number);
    closePreview();
    onAddPoi?.({ lng, lat, name: previewResult.name, address: previewResult.address || "", phone: previewResult.tel || "", amapPoiId: previewResult.id || undefined });
  };

  return (
    <section className="map-screen">
      <div ref={containerRef} className="mobile-map" />
      {!ready && !error && <div className="map-loading"><span /><b>正在加载地图</b></div>}
      {error && <div className="map-error"><b>{error}</b><button onClick={() => setError("")}><X size={16} /></button></div>}
      <div className="map-day-filter">
        <button className={dayFilter === "all" ? "active" : ""} onClick={() => setDayFilter("all")}>全部</button>
        {days.map((day) => <button key={day.id} className={dayFilter === day.dayNumber ? "active" : ""} style={{ "--day-color": DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length] } as React.CSSProperties} onClick={() => setDayFilter(day.dayNumber)}>D{day.dayNumber}</button>)}
      </div>
      <div className="map-search-box"><Search size={17} /><input value={mapQuery} onChange={(event) => setMapQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void searchOnMap()} placeholder="搜索地点并添加 POI" /><button onClick={() => void searchOnMap()} disabled={searching}>{searching ? "..." : "搜索"}</button></div>
      {searchResults.length > 0 && <div className="map-search-results">{searchResults.slice(0, 8).map((result) => <button key={`${result.id}-${result.location}`} onClick={() => chooseSearchResult(result)}><MapPin size={16} /><span><b>{result.name}</b><small>{result.address || result.location}</small></span><Plus size={16} /></button>)}</div>}
      <button className="locate-button" onClick={locate} aria-label="定位"><LocateFixed size={21} className={locating ? "spinning" : ""} /></button>
      <button className={`map-add-button ${pickingPoi ? "active" : ""}`} onClick={() => setPickingPoi((value) => !value)} aria-label="地图选点新增 POI"><Plus size={22} /></button>
      <button className={`map-layer-button ${showLayers ? "active" : ""}`} onClick={() => setShowLayers((value) => !value)} aria-label="地图图层"><Layers3 size={20} /></button>
      <button className="map-edge-button" onClick={() => setShowEdgeEditor(true)} aria-label="新增路线边"><RouteIcon size={20} /><Plus size={11} /></button>
      {showLayers && <div className="map-layer-panel"><b>地图图层</b><label><span>卫星视图</span><input type="checkbox" checked={satellite} onChange={(event) => setSatellite(event.target.checked)} /></label><label><span>显示 POI</span><input type="checkbox" checked={showPois} onChange={(event) => setShowPois(event.target.checked)} /></label><label><span>显示路线</span><input type="checkbox" checked={showRoutes} onChange={(event) => setShowRoutes(event.target.checked)} /></label><label><span>距离标签</span><input type="checkbox" checked={showDistances} onChange={(event) => setShowDistances(event.target.checked)} /></label></div>}
      {pickingPoi && <div className="map-pick-tip">点击地图上的位置新增 POI</div>}
      <div className="map-legend"><Navigation size={13} /><span>{dayFilter === "all" ? `${days.length} 天总路线` : `DAY ${dayFilter} 路线`}</span></div>
      {selectedPoi && <div className="map-poi-card navigation-card"><span className="map-card-icon"><MapPin size={20} /></span><div><b>{selectedPoi.name}</b><small>{selectedPoi.address || "暂无地址"}</small></div><a href={`https://uri.amap.com/navigation?to=${selectedPoi.lng},${selectedPoi.lat},${encodeURIComponent(selectedPoi.name)}&mode=car&policy=1&src=travectory&coordinate=gaode&callnative=1`} target="_blank" rel="noreferrer"><Navigation size={15} />导航</a><button onClick={() => setSelectedPoi(null)}><X size={18} /></button></div>}
      {previewResult && <div className="map-search-preview"><div><b>{previewResult.name}</b><small>{previewResult.address || previewResult.location}</small></div><button className="cancel" onClick={closePreview}>取消</button><button className="confirm" onClick={addPreviewPoi}><Plus size={15} />添加</button></div>}
      {showEdgeEditor && <EdgeEditor pois={pois} userId={userId} projectId={projectId} onClose={() => { setShowEdgeEditor(false); setPreviewRoute(null); }} onPreviewRoute={setPreviewRoute} onSaved={async () => { setShowEdgeEditor(false); setPreviewRoute(null); await onDataChanged?.(); }} />}
    </section>
  );
}

function selectedPath(edge: Edge): [number, number][] | null {
  if (edge.customRoute?.polyline?.length) return edge.customRoute.polyline;
  const routes = edge.drivingRoutes?.length ? edge.drivingRoutes : edge.cyclingRoutes?.length ? edge.cyclingRoutes : edge.walkingRoutes || [];
  return routes[edge.selectedRouteIndex]?.polyline || routes[0]?.polyline || null;
}

function edgeMetric(edge: Edge): { distance: number } | null {
  if (edge.customRoute) return edge.customRoute;
  const routes = edge.drivingRoutes?.length ? edge.drivingRoutes : edge.cyclingRoutes?.length ? edge.cyclingRoutes : edge.walkingRoutes || [];
  return routes[edge.selectedRouteIndex] || routes[0] || null;
}

function formatMapDistance(distance: number): string {
  return distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${Math.round(distance)}m`;
}
