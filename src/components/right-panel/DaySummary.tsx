"use client";

import { useEdgeStore } from "@/stores";
import { formatDistance, formatDuration } from "@/lib/geo";
import type { Day } from "@/types";

interface DaySummaryProps { day: Day; }

export function DaySummary({ day }: DaySummaryProps) {
  const { edges } = useEdgeStore();
  let td = 0, tt = 0, dd = 0, dt = 0, edgeCount = 0;

  const items = [...day.items].sort((a, b) => a.order - b.order);
  for (let i = 1; i < items.length; i++) {
    const eid = items[i].fromEdgeId;
    if (!eid) continue;
    const edge = edges.find((e) => e.id === eid);
    if (!edge) continue;
    const rs = edge.drivingRoutes.length ? edge.drivingRoutes : edge.cyclingRoutes.length ? edge.cyclingRoutes : edge.walkingRoutes;
    const r = rs[edge.selectedRouteIndex] || rs[0];
    if (r) { td += r.distance; tt += r.duration; edgeCount++;
      if (edge.transportMode === "driving") { dd += r.distance; dt += r.duration; } }
    else if (edge.customRoute) { td += edge.customRoute.distance; tt += edge.customRoute.duration; edgeCount++;
      if (edge.transportMode === "driving") { dd += edge.customRoute.distance; dt += edge.customRoute.duration; } }
  }

  if (edgeCount === 0) return null;

  return (
    <div className="border-t border-border pt-2 mt-2">
      <div className="text-xs font-medium mb-1">行程统计</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
        <div className="text-text-muted">总里程</div><div className="text-right font-medium">{formatDistance(td)}</div>
        <div className="text-text-muted">驾驶时长</div><div className="text-right font-medium text-primary">{formatDuration(dt)}</div>
        <div className="text-text-muted">总耗时</div><div className="text-right">{formatDuration(tt)}</div>
        <div className="text-text-muted">路段数</div><div className="text-right">{edgeCount}</div>
      </div>
    </div>
  );
}
