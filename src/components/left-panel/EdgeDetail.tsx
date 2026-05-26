"use client";

import { useState } from "react";
import { useEdgeStore, usePoiStore, useUiStore } from "@/stores";
import { TRANSPORT_LABELS } from "@/types";
import { formatDistance, formatDuration } from "@/lib/geo";
import { edgeApi } from "@/lib/api-client";
import { RouteAlternativeList } from "./RouteAlternativeList";
import type { RoutePath } from "@/types";

interface EdgeDetailProps {
  edgeId: string;
  onClose: () => void;
}

export function EdgeDetail({ edgeId, onClose }: EdgeDetailProps) {
  const edge = useEdgeStore((s) => s.edges.find((e) => e.id === edgeId));
  const { updateEdge, removeEdge, selectEdge } = useEdgeStore();
  const getPoiById = usePoiStore((s) => s.getPoiById);
  const setDirty = useUiStore((s) => s.setDirty);

  const [editing, setEditing] = useState(false);

  if (!edge) return null;

  const origin = getPoiById(edge.originId);
  const dest = getPoiById(edge.destinationId);

  const allRoutes = edge.transportMode === "driving" ? edge.drivingRoutes
    : edge.transportMode === "cycling" ? edge.cyclingRoutes
    : edge.transportMode === "walking" ? edge.walkingRoutes
    : [];

  const handleDelete = async () => {
    if (!confirm("确定要删除这条边吗？")) return;
    try {
      await edgeApi.delete(edge.id);
      removeEdge(edge.id);
      selectEdge(null);
      setDirty(true);
      onClose();
    } catch { /* ignore */ }
  };

  const handleSetDefaultRoute = (idx: number) => {
    updateEdge(edge.id, { selectedRouteIndex: idx });
    edgeApi.update(edge.id, { selectedRouteIndex: idx });
    setDirty(true);
  };

  const handleNameRoute = (idx: number, name: string) => {
    // Store route names in a custom note - we could extend the edge model for this
    setDirty(true);
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-xl w-[480px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="font-medium text-sm">路线边详情</span>
          <button className="text-xs text-text-muted hover:text-danger" onClick={handleDelete}>删除</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm">
            <span className="font-medium">{origin?.name || "?"}</span>
            <span className="mx-2 text-text-muted">→</span>
            <span className="font-medium">{dest?.name || "?"}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
              {TRANSPORT_LABELS[edge.transportMode]}
            </span>
            {!["train", "flight", "ferry"].includes(edge.transportMode) && (
              <span className="text-xs text-text-muted">
                {allRoutes.length} 个方案
              </span>
            )}
          </div>

          {/* Custom route info */}
          {edge.customRoute && (
            <div className="text-xs space-y-1 p-2 bg-gray-50 rounded">
              <div>名称: {edge.customRoute.routeName || edge.customRoute.routeNumber || "自定义路线"}</div>
              <div>里程: {formatDistance(edge.customRoute.distance)}</div>
              <div>耗时: {formatDuration(edge.customRoute.duration)}</div>
            </div>
          )}

          {/* Route alternatives */}
          {allRoutes.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1">路线方案（点击☆切换默认）</div>
              <RouteAlternativeList
                routes={allRoutes}
                selectedIndices={allRoutes.map((_, i) => i)}
                defaultIndex={edge.selectedRouteIndex}
                onToggleRoute={() => {}}
                onSetDefault={handleSetDefaultRoute}
                onNameRoute={handleNameRoute}
                routeNames={{}}
              />
            </div>
          )}

          {/* Meta info */}
          <div className="text-[10px] text-text-muted space-y-0.5 border-t pt-2">
            <div>创建: {new Date(edge.createdAt).toLocaleString("zh-CN")}</div>
            <div>更新: {new Date(edge.updatedAt).toLocaleString("zh-CN")}</div>
          </div>
        </div>
        <div className="p-3 border-t border-border">
          <button className="w-full py-1.5 text-xs border rounded hover:bg-gray-50" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
