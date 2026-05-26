"use client";

import { useState, useRef } from "react";
import { useEdgeStore, usePoiStore, useUiStore } from "@/stores";
import { TRANSPORT_LABELS, TRANSPORT_COLORS } from "@/types";
import type { TransportMode, CustomRoute, RoutePath } from "@/types";
import { edgeApi, routeApi } from "@/lib/api-client";
import { formatDistance, formatDuration } from "@/lib/geo";

interface EdgeEditorProps {
  onClose: () => void;
}

const ALL_STRATEGIES = ["0", "2", "1", "3", "5", "4"] as const;

const STRATEGY_NAMES: Record<string, string> = {
  "0": "最快路线", "2": "最短距离", "1": "避免收费",
  "3": "不走高速", "5": "不走高速且避免收费", "4": "躲避拥堵",
};

export function EdgeEditor({ onClose }: EdgeEditorProps) {
  const { pois } = usePoiStore();
  const { addEdge } = useEdgeStore();
  const setDirty = useUiStore((s) => s.setDirty);

  // Draggable state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  const [originId, setOriginId] = useState("");
  const [destId, setDestId] = useState("");
  const [mode, setMode] = useState<TransportMode>("driving");
  const [saving, setSaving] = useState(false);

  // Custom route
  const [useCustom, setUseCustom] = useState(false);
  const [customDist, setCustomDist] = useState("");
  const [customDur, setCustomDur] = useState("");
  const [customName, setCustomName] = useState("");

  // Route calculation
  const [routes, setRoutes] = useState<RoutePath[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Preview polyline refs
  const previewRef = useRef<unknown[]>([]);

  const clearPreview = () => {
    previewRef.current.forEach((obj) => {
      (obj as { setMap?: (m: null) => void }).setMap?.(null);
    });
    previewRef.current = [];
  };

  const showPreview = (routeIdx: number) => {
    clearPreview();
    if (!window.AMap) return;

    // Access global map via MapContainer's getMap
    const map = ((window as unknown) as Record<string, unknown>).__travectory_map as {
      add?: (obj: unknown) => void;
      setFitView?: () => void;
    } | undefined;
    if (!map) return;

    const route = routes[routeIdx];
    if (!route?.polyline?.length) return;

    const poly = new window.AMap.Polyline({
      path: route.polyline,
      strokeColor: "#f59e0b",
      strokeWeight: 6,
      strokeOpacity: 0.9,
      strokeStyle: "solid",
      zIndex: 300,
    });
    (poly as { setMap?: (m: unknown) => void }).setMap?.(map);
    previewRef.current.push(poly);
  };

  const handleCalculate = async () => {
    if (!originId || !destId) return;
    setCalculating(true);
    setCalcError("");
    clearPreview();
    setPreviewIndex(null);

    const origin = pois.find((p) => p.id === originId);
    const dest = pois.find((p) => p.id === destId);
    if (!origin || !dest) { setCalculating(false); return; }

    const originStr = `${origin.lng},${origin.lat}`;
    const destStr = `${dest.lng},${dest.lat}`;

    try {
      if (mode === "driving") {
        const results = await Promise.all(
          ALL_STRATEGIES.map(async (s) => {
            try {
              const r = await routeApi.calculate({
                origin: originStr, destination: destStr,
                mode: "driving", strategy: s,
              });
              return (r.routes || []).map((rt) => ({ ...rt, strategy: s }));
            } catch {
              return [] as RoutePath[];
            }
          })
        );
        const all = results.flat();
        // Keep all routes, don't dedup — user can compare
        setRoutes(all);
        setSelectedIndex(0);
      } else {
        const result = await routeApi.calculate({
          origin: originStr, destination: destStr, mode,
        });
        setRoutes(result.routes || []);
        setSelectedIndex(0);
      }
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : "计算失败");
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!originId || !destId) return;
    setSaving(true);

    const origin = pois.find((p) => p.id === originId);
    const dest = pois.find((p) => p.id === destId);

    let customRoute: CustomRoute | null = null;
    let dr: RoutePath[] = [];
    let cr: RoutePath[] = [];
    let wr: RoutePath[] = [];

    if (useCustom && origin && dest) {
      customRoute = {
        distance: parseInt(customDist) || 0,
        duration: (parseInt(customDur) || 0) * 60,
        polyline: [[origin.lng, origin.lat], [dest.lng, dest.lat]],
        routeName: customName || undefined,
      };
    } else {
      const selectedRoute = routes[selectedIndex];
      if (mode === "driving") dr = selectedRoute ? [selectedRoute] : [];
      else if (mode === "cycling") cr = selectedRoute ? [selectedRoute] : [];
      else if (mode === "walking") wr = selectedRoute ? [selectedRoute] : [];
    }

    try {
      const created = await edgeApi.create({
        originId, destinationId: destId, transportMode: mode,
        drivingRoutes: dr, cyclingRoutes: cr, walkingRoutes: wr,
        customRoute, selectedRouteIndex: 0,
      });
      addEdge(created);
      setDirty(true);
      clearPreview();
      onClose();
    } catch { /* ok */ }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose}>
      <div
        className="bg-surface rounded-lg shadow-xl w-[520px] max-h-[85vh] overflow-y-auto absolute"
        style={{ left: `calc(50% + ${pos.x}px)`, top: `calc(50% + ${pos.y}px)`, transform: "translate(-50%, -50%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-4 border-b border-border font-medium text-sm cursor-move select-none bg-gray-50 rounded-t-lg"
          onMouseDown={(e) => {
            dragRef.current = {
              dragging: true,
              startX: e.clientX,
              startY: e.clientY,
              startPosX: pos.x,
              startPosY: pos.y,
            };
            const onMove = (ev: MouseEvent) => {
              if (!dragRef.current.dragging) return;
              setPos({
                x: dragRef.current.startPosX + (ev.clientX - dragRef.current.startX),
                y: dragRef.current.startPosY + (ev.clientY - dragRef.current.startY),
              });
            };
            const onUp = () => {
              dragRef.current.dragging = false;
              document.removeEventListener("mousemove", onMove);
              document.removeEventListener("mouseup", onUp);
              document.body.style.cursor = "";
              document.body.style.userSelect = "";
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
            document.body.style.cursor = "move";
            document.body.style.userSelect = "none";
          }}
        >
          添加路线边
        </div>

        <div className="p-4 space-y-3">
          {/* Origin and destination */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">起点</label>
              <select
                className="w-full px-3 py-1.5 text-sm border border-border rounded"
                value={originId}
                onChange={(e) => setOriginId(e.target.value)}
              >
                <option value="">选择起点</option>
                {pois.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">终点</label>
              <select
                className="w-full px-3 py-1.5 text-sm border border-border rounded"
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
              >
                <option value="">选择终点</option>
                {pois.filter((p) => p.id !== originId).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transport mode */}
          <div>
            <label className="block text-xs text-text-muted mb-1">交通方式</label>
            <div className="flex gap-1 flex-wrap">
              {(Object.entries(TRANSPORT_LABELS) as [TransportMode, string][]).map(([m, label]) => (
                <button
                  key={m}
                  className={`text-xs px-2 py-1 rounded ${mode === m ? "bg-primary text-white" : "bg-gray-100"}`}
                  onClick={() => {
                    setMode(m);
                    setUseCustom(m === "train" || m === "flight" || m === "ferry");
                    setRoutes([]);
                    setPreviewIndex(null);
                    clearPreview();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom route fields */}
          {useCustom && (
            <div className="space-y-2 p-2 bg-gray-50 rounded">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-text-muted">里程(m)</label>
                  <input className="w-full px-2 py-1 text-xs border rounded" value={customDist} onChange={(e) => setCustomDist(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-text-muted">耗时(分钟)</label>
                  <input className="w-full px-2 py-1 text-xs border rounded" value={customDur} onChange={(e) => setCustomDur(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-text-muted">名称</label>
                <input className="w-full px-2 py-1 text-xs border rounded" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="如: G1234 高铁" />
              </div>
            </div>
          )}

          {/* Calculate button (non-custom) */}
          {!useCustom && (
            <button
              className="w-full py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              onClick={handleCalculate}
              disabled={!originId || !destId || calculating}
            >
              {calculating ? "计算中..." : routes.length > 0 ? "重新计算路线" : "计算路线"}
            </button>
          )}

          {/* Route list */}
          {routes.length > 0 && (
            <div className="border border-border rounded divide-y divide-border max-h-64 overflow-y-auto">
              {routes.map((route, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 cursor-pointer transition-colors ${
                    selectedIndex === idx ? "bg-blue-50 border-l-2 border-primary" : "border-l-2 border-transparent hover:bg-gray-50"
                  } ${previewIndex === idx ? "ring-1 ring-yellow-400" : ""}`}
                  onClick={() => {
                    setSelectedIndex(idx);
                    clearPreview();
                    setPreviewIndex(null);
                  }}
                  onMouseEnter={() => {
                    setPreviewIndex(idx);
                    showPreview(idx);
                  }}
                  onMouseLeave={() => {
                    setPreviewIndex(null);
                    clearPreview();
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {STRATEGY_NAMES[route.strategy || "0"] || "路线"} #{idx + 1}
                    </span>
                    {selectedIndex === idx && (
                      <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded">已选</span>
                    )}
                    {previewIndex === idx && (
                      <span className="text-[10px] bg-yellow-400 text-white px-1.5 py-0.5 rounded">预览中</span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {formatDistance(route.distance)} · {formatDuration(route.duration)}
                    {route.tolls > 0 && ` · 收费¥${route.tolls}`}
                  </div>
                </div>
              ))}
              <div className="p-1.5 text-[10px] text-text-muted bg-gray-50">
                悬停预览路线，点击选择。拖动地图可查看完整路径。
              </div>
            </div>
          )}

          {calcError && (
            <div className="text-xs text-danger p-2 bg-red-50 rounded">{calcError}</div>
          )}
        </div>

        <div className="p-4 border-t border-border flex gap-2 justify-end">
          <button
            className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
            onClick={() => { clearPreview(); onClose(); }}
          >
            取消
          </button>
          <button
            className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
            onClick={handleSave}
            disabled={!originId || !destId || saving}
          >
            {saving ? "保存中..." : `保存边${!useCustom && routes.length > 0 ? ` (${STRATEGY_NAMES[routes[selectedIndex]?.strategy || "0"]})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
