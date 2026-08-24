"use client";

import { useScheduleStore, useEdgeStore } from "@/stores";
import { formatDistance, formatDuration } from "@/lib/geo";

export function TripSummary() {
  const days = useScheduleStore((s) => s.days);
  const edges = useEdgeStore((s) => s.edges);

  let totalDist = 0, totalDur = 0, drivingDist = 0, drivingDur = 0;
  let edgeCount = 0, poiCount = 0;

  days.forEach((day) => {
    const items = [...day.items].sort((a, b) => a.order - b.order);
    poiCount += items.length;
    for (let i = 1; i < items.length; i++) {
      const eid = items[i].fromEdgeId;
      if (!eid) continue;
      const edge = edges.find((e) => e.id === eid);
      if (!edge) continue;
      const rs = edge.drivingRoutes.length ? edge.drivingRoutes : edge.cyclingRoutes.length ? edge.cyclingRoutes : edge.walkingRoutes;
      const r = rs[edge.selectedRouteIndex] || rs[0];
      if (r) { totalDist += r.distance; totalDur += r.duration; edgeCount++;
        if (edge.transportMode === "driving") { drivingDist += r.distance; drivingDur += r.duration; } }
      else if (edge.customRoute) { totalDist += edge.customRoute.distance; totalDur += edge.customRoute.duration; edgeCount++;
        if (edge.transportMode === "driving") { drivingDist += edge.customRoute.distance; drivingDur += edge.customRoute.duration; } }
    }
  });

  if (days.length === 0) return null;

  return (
    <div className="border-t border-border p-3 shrink-0 bg-gray-50">
      <div className="text-xs font-medium mb-2">📊 全程统计</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
        <div className="text-text-muted">总天数</div><div className="text-right font-medium">{days.length} 天</div>
        <div className="text-text-muted">总里程</div><div className="text-right font-medium">{formatDistance(totalDist)}</div>
        <div className="text-text-muted">驾驶时长</div><div className="text-right font-bold text-primary">{formatDuration(drivingDur)}</div>
        <div className="text-text-muted">总耗时</div><div className="text-right">{formatDuration(totalDur)}</div>
        <div className="text-text-muted">驾车里程</div><div className="text-right">{formatDistance(drivingDist)}</div>
        <div className="text-text-muted">路段数</div><div className="text-right">{edgeCount}</div>
        <div className="text-text-muted">POI 数</div><div className="text-right">{poiCount}</div>
      </div>
    </div>
  );
}
