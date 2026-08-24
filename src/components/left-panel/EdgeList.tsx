"use client";

import { useMemo } from "react";
import { useEdgeStore, usePoiStore, useUiStore } from "@/stores";
import { TRANSPORT_LABELS, TRANSPORT_COLORS } from "@/types";
import { formatDistance, formatDuration } from "@/lib/geo";
import { edgeApi } from "@/lib/api-client";

export function EdgeList() {
  const edges = useEdgeStore((s) => s.edges);
  const filterMode = useEdgeStore((s) => s.filterMode);
  const selectEdge = useEdgeStore((s) => s.selectEdge);
  const removeEdge = useEdgeStore((s) => s.removeEdge);
  const selectedEdgeId = useEdgeStore((s) => s.selectedEdgeId);
  const getPoiById = usePoiStore((s) => s.getPoiById);
  const setDirty = useUiStore((s) => s.setDirty);

  const filteredEdges = useMemo(() => {
    if (filterMode === "all") return edges;
    return edges.filter((e) => e.transportMode === filterMode);
  }, [edges, filterMode]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("确定删除这条路线边吗？")) return;
    try { await edgeApi.delete(id); } catch { /* ok */ }
    removeEdge(id);
    setDirty(true);
  };

  if (filteredEdges.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-text-muted">
        暂无路线边<br/>点击下方按钮添加
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {filteredEdges.map((edge) => {
        const origin = getPoiById(edge.originId);
        const dest = getPoiById(edge.destinationId);
        const isSel = selectedEdgeId === edge.id;
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
            className={`group flex items-start gap-2 p-2.5 cursor-pointer transition-colors ${
              isSel ? "bg-blue-50 border-l-2 border-primary" : "border-l-2 border-transparent hover:bg-gray-50"
            }`}
            onClick={() => selectEdge(edge.id)}
          >
            <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 text-white mt-0.5" style={{ backgroundColor: TRANSPORT_COLORS[edge.transportMode] || "#999" }}>
              {TRANSPORT_LABELS[edge.transportMode] || edge.transportMode}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate">{origin?.name || "?"} → {dest?.name || "?"}</div>
              {activeRoute && (
                <div className="text-[10px] text-text-muted mt-0.5">
                  {formatDistance(activeRoute.distance)} · {formatDuration(activeRoute.duration)}
                  {edge.transportMode === "driving" && activeRoute.tolls > 0 && ` · ¥${activeRoute.tolls}`}
                </div>
              )}
              {edge.customRoute && (
                <div className="text-[10px] text-text-muted mt-0.5">
                  {edge.customRoute.routeName || "自定义路线"} · {formatDistance(edge.customRoute.distance)}
                </div>
              )}
            </div>
            <button
              className="w-5 h-5 flex items-center justify-center text-[10px] text-text-muted hover:text-danger hover:bg-red-50 rounded shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => handleDelete(edge.id, e)}
              title="删除"
            >✕</button>
          </div>
        );
      })}
    </div>
  );
}
