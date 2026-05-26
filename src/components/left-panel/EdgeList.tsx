"use client";

import { useMemo } from "react";
import { useEdgeStore, usePoiStore } from "@/stores";
import { TRANSPORT_LABELS, TRANSPORT_COLORS } from "@/types";
import { formatDistance, formatDuration } from "@/lib/geo";

export function EdgeList() {
  const edges = useEdgeStore((s) => s.edges);
  const filterMode = useEdgeStore((s) => s.filterMode);
  const selectEdge = useEdgeStore((s) => s.selectEdge);
  const selectedEdgeId = useEdgeStore((s) => s.selectedEdgeId);
  const getPoiById = usePoiStore((s) => s.getPoiById);

  const filteredEdges = useMemo(() => {
    if (filterMode === "all") return edges;
    return edges.filter((e) => e.transportMode === filterMode);
  }, [edges, filterMode]);

  if (filteredEdges.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-text-muted">
        暂无路线边<br />
        在 POI 列表中选中起点后添加
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {filteredEdges.map((edge) => {
        const origin = getPoiById(edge.originId);
        const dest = getPoiById(edge.destinationId);
        const routes = edge.drivingRoutes.length || edge.cyclingRoutes.length || edge.walkingRoutes.length;
        const activeRoute = edge.transportMode === "driving"
          ? edge.drivingRoutes[edge.selectedRouteIndex]
          : edge.transportMode === "cycling"
          ? edge.cyclingRoutes[edge.selectedRouteIndex]
          : edge.transportMode === "walking"
          ? edge.walkingRoutes[edge.selectedRouteIndex]
          : null;

        return (
          <div
            key={edge.id}
            className={`p-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedEdgeId === edge.id ? "bg-blue-50 border-l-2 border-primary" : "border-l-2 border-transparent"
            }`}
            onClick={() => selectEdge(edge.id)}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded shrink-0 text-white"
                style={{ backgroundColor: TRANSPORT_COLORS[edge.transportMode] || "#999" }}
              >
                {TRANSPORT_LABELS[edge.transportMode] || edge.transportMode}
              </span>
              <span className="text-xs truncate">
                {origin?.name || "?"} → {dest?.name || "?"}
              </span>
            </div>
            {activeRoute && (
              <div className="text-[10px] text-text-muted mt-0.5 ml-1">
                {formatDistance(activeRoute.distance)} · {formatDuration(activeRoute.duration)}
                {routes > 1 && ` · ${routes}方案`}
              </div>
            )}
            {edge.customRoute && (
              <div className="text-[10px] text-text-muted mt-0.5 ml-1">
                {edge.customRoute.routeName || "自定义路线"} · {formatDistance(edge.customRoute.distance)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
