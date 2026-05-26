"use client";

import { useState } from "react";
import { useScheduleStore, useEdgeStore, usePoiStore, useUiStore } from "@/stores";
import { scheduleApi } from "@/lib/api-client";
import { formatDistance, formatDuration } from "@/lib/geo";
import type { Day, TransportMode } from "@/types";

interface SmartCompleteProps {
  day: Day;
}

export function SmartComplete({ day }: SmartCompleteProps) {
  const edges = useEdgeStore((s) => s.edges);
  const getPoiById = usePoiStore((s) => s.getPoiById);
  const updateItem = useScheduleStore((s) => s.updateItem);
  const setDirty = useUiStore((s) => s.setDirty);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<Array<{
    itemId: string;
    fromPoi: string;
    toPoi: string;
    hasEdge: boolean;
    edgeId?: string;
    transportMode?: TransportMode;
    distance?: number;
    duration?: number;
  }> | null>(null);

  const handleAnalyze = () => {
    setAnalyzing(true);
    const sortedItems = [...day.items].sort((a, b) => a.order - b.order);
    const analysis: typeof results = [];

    for (let i = 1; i < sortedItems.length; i++) {
      const prevItem = sortedItems[i - 1];
      const currItem = sortedItems[i];
      const prevPoi = getPoiById(prevItem.poiId);
      const currPoi = getPoiById(currItem.poiId);
      if (!prevPoi || !currPoi) continue;

      // Search for edges connecting these two POIs
      const directEdges = edges.filter(
        (e) =>
          (e.originId === prevItem.poiId && e.destinationId === currItem.poiId) ||
          (e.originId === currItem.poiId && e.destinationId === prevItem.poiId)
      );

      if (directEdges.length > 0) {
        const edge = directEdges[0];
        const routes = edge.transportMode === "driving" ? edge.drivingRoutes
          : edge.transportMode === "cycling" ? edge.cyclingRoutes
          : edge.transportMode === "walking" ? edge.walkingRoutes
          : [];
        const route = routes[edge.selectedRouteIndex];
        const dist = route?.distance || edge.customRoute?.distance || 0;
        const dur = route?.duration || edge.customRoute?.duration || 0;

        analysis.push({
          itemId: currItem.id,
          fromPoi: prevPoi.name,
          toPoi: currPoi.name,
          hasEdge: true,
          edgeId: edge.id,
          transportMode: edge.transportMode,
          distance: dist,
          duration: dur,
        });
      } else {
        // Check for indirect paths (A→C→B)
        const intermediatePois: Array<{ poiId: string; name: string }> = [];
        const fromEdges = edges.filter((e) => e.originId === prevItem.poiId || e.destinationId === prevItem.poiId);
        for (const e1 of fromEdges) {
          const midId = e1.originId === prevItem.poiId ? e1.destinationId : e1.originId;
          const toEdges = edges.filter(
            (e2) =>
              (e2.originId === midId && e2.destinationId === currItem.poiId) ||
              (e2.destinationId === midId && e2.originId === currItem.poiId)
          );
          if (toEdges.length > 0 && midId !== prevItem.poiId && midId !== currItem.poiId) {
            const midPoi = getPoiById(midId);
            if (midPoi && !intermediatePois.find((p) => p.poiId === midId)) {
              intermediatePois.push({ poiId: midId, name: midPoi.name });
            }
          }
        }

        analysis.push({
          itemId: currItem.id,
          fromPoi: prevPoi.name,
          toPoi: currPoi.name,
          hasEdge: false,
        });
      }
    }

    setResults(analysis);
    setAnalyzing(false);
  };

  const handleApply = async (itemId: string, edgeId: string) => {
    updateItem(itemId, { fromEdgeId: edgeId });
    await scheduleApi.update(itemId, { fromEdgeId: edgeId });
    setDirty(true);
    // Remove from results
    setResults((prev) => prev?.filter((r) => r.itemId !== itemId) || null);
  };

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        className="w-full py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        onClick={handleAnalyze}
        disabled={analyzing || day.items.length < 2}
      >
        {analyzing ? "分析中..." : "智能路径补全"}
      </button>

      {results && results.length === 0 && (
        <div className="text-xs text-success mt-2 text-center py-2">
          ✓ 所有连续 POI 之间的边已配置完毕
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          {results.map((r) => (
            <div
              key={r.itemId}
              className={`text-xs border rounded p-2 ${r.hasEdge ? "border-success/50 bg-green-50" : "border-warning/50 bg-yellow-50"}`}
            >
              <div className="font-medium">
                {r.fromPoi} → {r.toPoi}
              </div>
              {r.hasEdge ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-text-muted">
                    {r.transportMode} · {r.distance ? formatDistance(r.distance) : ""}
                    {r.duration ? ` · ${formatDuration(r.duration)}` : ""}
                  </span>
                  <button
                    className="ml-auto px-2 py-0.5 bg-success text-white rounded text-[10px]"
                    onClick={() => handleApply(r.itemId, r.edgeId!)}
                  >
                    应用
                  </button>
                </div>
              ) : (
                <div className="text-danger mt-1">
                  无直接边，请手动创建或忽略
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
