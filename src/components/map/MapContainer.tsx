"use client";

import { useEffect, useRef, useState } from "react";
import { usePoiStore, useEdgeStore, useScheduleStore, useUiStore, useMapStore } from "@/stores";
import { POI_TAG_COLORS, POI_TAG_LABELS, TRANSPORT_COLORS } from "@/types";
import { formatDistance } from "@/lib/geo";
import { getDayColor } from "@/stores/map-store";
import { POIEditor } from "@/components/left-panel/POIEditor";

const AMAP_KEY = "845e62b164ef5f9f6cf9b26a98f3cd4a";
const AMAP_SECRET = "fcbdbb9b1e5d1409235e80f665996ba4";
const PLUGINS = "AMap.Marker,AMap.Polyline,AMap.PolyEditor,AMap.Geocoder,AMap.AutoComplete,AMap.PlaceSearch,AMap.Driving,AMap.Walking,AMap.Riding,AMap.InfoWindow,AMap.Pixel,AMap.Bounds";

let globalMap: unknown = null;
export function getMap(): unknown { return globalMap; }

export function MapContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<Map<string, unknown>>(new Map());
  const polyObjsRef = useRef<unknown[]>([]);
  const overlayObjsRef = useRef<unknown[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [debug, setDebug] = useState("");
  const [clickedPos, setClickedPos] = useState<{ lng: number; lat: number } | null>(null);
  const [featureConfirm, setFeatureConfirm] = useState<{ pois: Array<{ id: string; name: string; address: string }>; lng: number; lat: number; address: string } | null>(null);
  const [satellite, setSatellite] = useState(false);
  const satelliteLayersRef = useRef<unknown[]>([]);

  // Effect 1: Load Amap script and create map (one-time)
  useEffect(() => {
    let active = true;
    const SCRIPT_URL = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=${encodeURIComponent(PLUGINS)}`;

    // Check if Amap is already loaded
    if (window.AMap && (window.AMap as unknown as { Map?: unknown }).Map) {
      setDebug("Amap already loaded (HMR)");
      createMapIfReady();
      return () => { active = false; };
    }

    // Check if our script is already in DOM (from HMR reload)
    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existingScript) {
      setDebug("Script already in DOM (HMR), waiting...");
      waitForAmap();
      return () => { active = false; };
    }

    // Set security config first
    console.log("[Travectory] Setting _AMapSecurityConfig...");
    window._AMapSecurityConfig = { securityJsCode: AMAP_SECRET };

    // Create and insert script dynamically
    console.log("[Travectory] Creating script element...");
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.onload = () => {
      console.log("[Travectory] Script onload fired");
      waitForAmap();
    };
    script.onerror = () => {
      console.error("[Travectory] Script onerror fired");
      if (active) {
        setError("无法加载高德地图脚本，请检查网络连接");
        setDebug("Script load error");
      }
    };

    document.head.appendChild(script);
    setDebug("Script appended, waiting...");
    console.log("[Travectory] Script appended to head, URL:", SCRIPT_URL);

    function waitForAmap() {
      let attempts = 0;
      function poll() {
        if (!active) return;
        const container = containerRef.current;
        const hasAMap = typeof window.AMap !== "undefined";
        const hasMap = hasAMap && !!(window.AMap as unknown as { Map?: unknown }).Map;

        if (attempts % 30 === 0) {
          const msg = `poll #${attempts} AMap=${hasAMap} Map=${hasMap} container=${!!container}`;
          setDebug(msg);
          console.log("[Travectory]", msg);
        }

        if (hasMap && container) {
          createMap(container);
        } else if (attempts < 200) {
          attempts++;
          setTimeout(poll, 100);
        } else {
          const msg = `超时: AMap=${hasAMap} Map=${hasMap} container=${!!container}`;
          if (active) { setError(msg); setDebug(msg); }
          console.error("[Travectory]", msg);
        }
      }
      poll();
    }

    function createMapIfReady() {
      const container = containerRef.current;
      if (container && window.AMap && (window.AMap as unknown as { Map?: unknown }).Map) {
        createMap(container);
      } else {
        waitForAmap();
      }
    }

    function createMap(container: HTMLDivElement) {
      try {
        setDebug("Creating AMap.Map...");
        console.log("[Travectory] Creating map on container");
        // Force the container to fill its parent
        const parent = container.parentElement;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          console.log("[Travectory] Parent rect:", parentRect.width, "x", parentRect.height);
          container.style.position = "absolute";
          container.style.top = "0";
          container.style.left = "0";
          container.style.width = parentRect.width + "px";
          container.style.height = parentRect.height + "px";
        }

        const map = new window.AMap.Map(container, {
          zoom: 5,
          center: [104.0, 35.0],
          viewMode: "2D",
          resizeEnable: true,
        });
        mapRef.current = map;
        globalMap = map;
        ((window as unknown) as Record<string, unknown>).__travectory_map = map;
        console.log("[Travectory] Map created! Container after sizing:", container.style.width, "x", container.style.height);

        // Force resize after layout
        setTimeout(() => {
          const parent = container.parentElement;
          if (parent) {
            const r = parent.getBoundingClientRect();
            container.style.width = r.width + "px";
            container.style.height = r.height + "px";
          }
          console.log("[Travectory] Resize check. Container:", container.offsetWidth, "x", container.offsetHeight);
          (map as { resize?: () => void }).resize?.();
        }, 200);

        // Map click: reverse-geocode to find nearby POIs, then offer quick-add
        const mapWithClick = map as {
          on?: (e: string, cb: (ev: { lnglat: { lng: number; lat: number } }) => void) => void;
        };
        mapWithClick.on?.("click", async (e) => {
          const lng = e.lnglat.lng;
          const lat = e.lnglat.lat;

          const stored = localStorage.getItem("travectory_user");
          const uid = stored ? JSON.parse(stored).id || "default" : "default";

          try {
            const res = await fetch("/api/poi/geocode", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-id": uid },
              body: JSON.stringify({ lng, lat }),
            });
            const data = await res.json();
            const nearbyPois: Array<{ id: string; name: string; address: string }> = data?.nearbyPois || [];

            // If there are nearby POIs, show quick-add picker
            if (nearbyPois.length > 0) {
              setFeatureConfirm({ pois: nearbyPois, lng, lat, address: data?.address || "" });
            } else {
              // No nearby POI found — open full editor
              setClickedPos({ lng, lat });
            }
          } catch {
            setClickedPos({ lng, lat });
          }
        });

        if (active) {
          setReady(true);
          setDebug("READY ✓");
        }
      } catch (err) {
        const msg = "Map error: " + (err instanceof Error ? err.message : String(err));
        console.error("[Travectory]", msg, err);
        if (active) { setError(msg); setDebug(msg); }
      }
    }

    return () => { active = false; };
  }, []);

  // Effect 2: Re-render map layers when stores change
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!ready) return;
    const unsubs = [
      usePoiStore.subscribe(() => setTick((t) => t + 1)),
      useEdgeStore.subscribe(() => setTick((t) => t + 1)),
      useScheduleStore.subscribe(() => setTick((t) => t + 1)),
      useUiStore.subscribe(() => setTick((t) => t + 1)),
      useMapStore.subscribe((s) => {
        const m = mapRef.current as { setZoomAndCenter?: (z: number, c: [number, number]) => void } | null;
        m?.setZoomAndCenter?.(s.zoom, s.center);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [ready]);

  // Effect 3: Render layers
  useEffect(() => {
    if (!ready || !mapRef.current || !window.AMap) return;
    const map = mapRef.current;
    const AMap = window.AMap;

    // Clear
    markersRef.current.forEach((m) => (m as { setMap?: (m: null) => void }).setMap?.(null));
    markersRef.current.clear();
    polyObjsRef.current.forEach((o) => (o as { setMap?: (m: null) => void }).setMap?.(null));
    polyObjsRef.current = [];
    overlayObjsRef.current.forEach((o) => (o as { setMap?: (m: null) => void }).setMap?.(null));
    overlayObjsRef.current = [];

    const storePois = usePoiStore.getState().pois;
    const storeEdges = useEdgeStore.getState().filteredEdges();
    const storeDays = useScheduleStore.getState().days;
    const showDayOverlay = useUiStore.getState().showDayOverlay;
    const showDistLabels = useUiStore.getState().showDistanceLabels;
    const selectedPoiId = usePoiStore.getState().selectedPoiId;

    storePois.forEach((poi) => {
      const isHotel = poi.tag === "hotel";
      const color = POI_TAG_COLORS[poi.tag];
      const sel = poi.id === selectedPoiId;
      const iconSize = sel ? 30 : 26;
      const iconEmoji = isHotel ? "🏨" : "📍";
      const content = `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div style="background:${color};color:white;width:${iconSize}px;height:${iconSize}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isHotel ? 14 : 11}px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">${iconEmoji}</div>
        <div style="margin-top:2px;background:rgba(255,255,255,0.9);color:#333;font-size:10px;padding:1px 4px;border-radius:3px;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 3px rgba(0,0,0,0.15);line-height:1.3;">${poi.name}</div>
      </div>`;

      const marker = new AMap.Marker({
        position: [poi.lng, poi.lat],
        content,
        offset: new AMap.Pixel(-iconSize / 2, -(iconSize + 18)),
        zIndex: sel ? 200 : 100,
      });

      (marker as { on?: (e: string, cb: () => void) => void }).on?.("click", () => {
        usePoiStore.getState().selectPoi(poi.id);
        (map as { setZoomAndCenter?: (z: number, c: [number, number]) => void }).setZoomAndCenter?.(13, [poi.lng, poi.lat]);

        const scheduleDays = useScheduleStore.getState().getDaysForPoi(poi.id);
        const daysInfo = scheduleDays.length
          ? `<div style="font-size:10px;color:#3b82f6;margin-top:2px;">出现在: ${scheduleDays.map(d => d.day.label || `Day ${d.day.dayNumber}`).join(", ")}</div>`
          : "";

        const iw = new AMap.InfoWindow({
          content: `<div style="padding:8px;min-width:180px;">
            <div style="font-weight:bold;font-size:13px;">${poi.name}</div>
            <div style="font-size:11px;color:#666;">${poi.address || ""}</div>
            <div style="font-size:10px;color:#999;">${poi.lng.toFixed(4)}, ${poi.lat.toFixed(4)}</div>
            <div style="margin-top:3px;"><span style="font-size:10px;background:${color}20;color:${color};padding:1px 4px;border-radius:2px;">${POI_TAG_LABELS[poi.tag]}</span></div>
            ${daysInfo}
          </div>`,
          offset: new AMap.Pixel(0, -30),
        });
        (map as { openInfoWindow?: (iw: unknown, pos: [number, number]) => void }).openInfoWindow?.(iw, [poi.lng, poi.lat]);
      });

      (marker as { setMap?: (m: unknown) => void }).setMap?.(map);
      markersRef.current.set(poi.id, marker);
    });

    storeEdges.forEach((edge) => {
      const color = TRANSPORT_COLORS[edge.transportMode] || "#999";
      const isCustom = ["train", "flight", "ferry"].includes(edge.transportMode);

      let path: [number, number][] | null = null;
      let dist = 0;

      if (isCustom && edge.customRoute) {
        path = edge.customRoute.polyline;
        dist = edge.customRoute.distance;
      } else {
        const routes = edge.drivingRoutes.length ? edge.drivingRoutes
          : edge.cyclingRoutes.length ? edge.cyclingRoutes
          : edge.walkingRoutes.length ? edge.walkingRoutes : [];
        if (routes.length) {
          const r = routes[edge.selectedRouteIndex] || routes[0];
          path = r.polyline;
          dist = r.distance;
        }
      }

      // Only draw edges that have real route data (no straight-line fallback)
      if (!path || path.length < 2) return;

      const poly = new AMap.Polyline({
        path,
        strokeColor: color,
        strokeWeight: isCustom ? 2 : 4,
        strokeOpacity: 0.8,
        strokeStyle: isCustom ? "dashed" : "solid",
        lineJoin: "round",
        zIndex: 50,
      });

      (poly as { on?: (e: string, cb: () => void) => void }).on?.("click", () => {
        useEdgeStore.getState().selectEdge(edge.id);
      });

      (poly as { setMap?: (m: unknown) => void }).setMap?.(map);
      polyObjsRef.current.push(poly);

      if (showDistLabels && dist > 0 && AMap.Text && path.length >= 2) {
        const mid = path[Math.floor(path.length / 2)];
        const text = new AMap.Text({
          text: formatDistance(dist),
          position: mid,
          style: {
            "background-color": "rgba(255,255,255,0.85)",
            "border": "1px solid " + color,
            "font-size": "10px",
            "padding": "1px 4px",
            "border-radius": "3px",
            "color": color,
          },
        });
        (text as { setMap?: (m: unknown) => void }).setMap?.(map);
        polyObjsRef.current.push(text);
      }
    });

    if (showDayOverlay) {
      storeDays.forEach((day, di) => {
        const color = getDayColor(di);
        [...day.items].sort((a, b) => a.order - b.order).forEach((item, i) => {
          const poi = storePois.find((p) => p.id === item.poiId);
          if (!poi) return;
          const badge = `<div style="background:${color};color:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:2px solid white;">${day.dayNumber}</div>`;
          const m = new AMap.Marker({
            position: [poi.lng, poi.lat],
            content: badge,
            offset: new AMap.Pixel(-11, -11),
            zIndex: 90,
          });
          (m as { setMap?: (map: unknown) => void }).setMap?.(map);
          overlayObjsRef.current.push(m);
          if (i > 0 && item.fromEdgeId) {
            const edge = useEdgeStore.getState().edges.find((e) => e.id === item.fromEdgeId);
            if (edge) {
              const routes = edge.drivingRoutes.length ? edge.drivingRoutes
                : edge.cyclingRoutes.length ? edge.cyclingRoutes
                : edge.walkingRoutes.length ? edge.walkingRoutes : [];
              const route = routes[edge.selectedRouteIndex];
              const pp = route?.polyline || edge.customRoute?.polyline;
              if (pp?.length) {
                const pl = new AMap.Polyline({
                  path: pp, strokeColor: color, strokeWeight: 5,
                  strokeOpacity: 0.6, zIndex: 55,
                });
                (pl as { setMap?: (m: unknown) => void }).setMap?.(map);
                overlayObjsRef.current.push(pl);
              }
            }
          }
        });
      });
    }
  });

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center text-danger p-4 max-w-xs">
            <p className="font-medium">地图加载失败</p>
            <p className="text-xs mt-1 break-all">{error}</p>
            <button className="mt-3 px-3 py-1.5 text-xs bg-primary text-white rounded" onClick={() => window.location.reload()}>
              刷新重试
            </button>
          </div>
        </div>
      )}

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center max-w-xs">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-text-muted">加载地图中...</p>
            {debug && (
              <p className="text-[10px] text-text-muted mt-1 font-mono bg-gray-200 p-1 rounded whitespace-pre-wrap break-all">
                {debug}
              </p>
            )}
          </div>
        </div>
      )}

      {ready && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex gap-1">
          <button
            className="w-8 h-8 bg-white rounded shadow hover:bg-gray-50 flex items-center justify-center text-xs"
            onClick={() => (mapRef.current as { setZoomAndCenter?: (z: number, c: [number, number]) => void })?.setZoomAndCenter?.(5, [104.0, 35.0])}
            title="全国视图"
          >
            🏠
          </button>
          <button
            className={`w-8 h-8 rounded shadow flex items-center justify-center text-xs ${satellite ? "bg-blue-500 text-white" : "bg-white hover:bg-gray-50"}`}
            onClick={() => {
              const map = mapRef.current as {
                addLayer?: (layer: unknown) => void;
                removeLayer?: (layer: unknown) => void;
              } | null;
              if (!map || !window.AMap) return;

              const newSat = !satellite;
              if (newSat) {
                // Add satellite layers on top of base layer
                const sat = new window.AMap.TileLayer.Satellite();
                const road = new window.AMap.TileLayer.RoadNet();
                satelliteLayersRef.current = [sat, road];
                // Insert satellite below labels, road net on top
                map.addLayer?.(sat);
                map.addLayer?.(road);
              } else {
                // Remove satellite-specific layers, base layer remains
                satelliteLayersRef.current.forEach((layer) => {
                  try { map.removeLayer?.(layer); } catch { /* ok */ }
                });
                satelliteLayersRef.current = [];
              }
              setSatellite(newSat);
            }}
            title="卫星/标准切换"
          >
            🛰
          </button>
        </div>
      )}

      {/* Nearby POI quick-add picker */}
      {featureConfirm && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-white rounded-lg shadow-xl w-80 max-h-[60vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
            <span className="text-sm font-medium">附近 POI</span>
            <button className="text-xs text-text-muted hover:text-text" onClick={() => setFeatureConfirm(null)}>✕</button>
          </div>
          <div className="text-[10px] text-text-muted px-3 py-1 shrink-0">
            {featureConfirm.address}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {featureConfirm.pois.slice(0, 10).map((poi) => (
              <div
                key={poi.id || poi.name}
                className="p-2.5 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                onClick={async () => {
                  try {
                    const stored = localStorage.getItem("travectory_user");
                    const uid = stored ? JSON.parse(stored).id || "default" : "default";
                    const res = await fetch("/api/poi", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "x-user-id": uid },
                      body: JSON.stringify({
                        name: poi.name,
                        lng: featureConfirm.lng,
                        lat: featureConfirm.lat,
                        address: poi.address || featureConfirm.address,
                        tag: "normal",
                      }),
                    });
                    if (res.ok) {
                      const newPoi = await res.json();
                      usePoiStore.getState().addPoi(newPoi);
                      useUiStore.getState().setDirty(true);
                    }
                  } catch { /* ok */ }
                  setFeatureConfirm(null);
                }}
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{poi.name}</div>
                  {poi.address && <div className="text-[10px] text-text-muted truncate">{poi.address}</div>}
                </div>
                <span className="text-[10px] text-primary shrink-0 ml-2">+ 添加</span>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-border shrink-0">
            <button
              className="w-full py-1.5 text-xs border border-border rounded hover:bg-gray-50"
              onClick={() => {
                setClickedPos({ lng: featureConfirm.lng, lat: featureConfirm.lat });
                setFeatureConfirm(null);
              }}
            >
              自定义添加...
            </button>
          </div>
        </div>
      )}

      {clickedPos && (
        <POIEditor initialLng={clickedPos.lng} initialLat={clickedPos.lat} onClose={() => setClickedPos(null)} />
      )}
    </>
  );
}
