"use client";

import { useEdgeStore } from "@/stores";
import { formatDistance, formatDuration } from "@/lib/geo";
import type { Day } from "@/types";

interface DaySummaryProps {
  day: Day;
}

export function DaySummary({ day }: DaySummaryProps) {
  const { edges } = useEdgeStore();

  let totalDistance = 0;
  let totalDuration = 0;
  let drivingDistance = 0;
  let drivingDuration = 0;

  const sortedItems = [...day.items].sort((a, b) => a.order - b.order);

  for (let i = 1; i < sortedItems.length; i++) {
    const edgeId = sortedItems[i].fromEdgeId;
    if (!edgeId) continue;
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) continue;

    const routes = edge.transportMode === "driving"
      ? edge.drivingRoutes
      : edge.transportMode === "cycling"
      ? edge.cyclingRoutes
      : edge.transportMode === "walking"
      ? edge.walkingRoutes
      : [];

    const route = routes[edge.selectedRouteIndex];
    if (route) {
      totalDistance += route.distance;
      totalDuration += route.duration;
      if (edge.transportMode === "driving") {
        drivingDistance += route.distance;
        drivingDuration += route.duration;
      }
    } else if (edge.customRoute) {
      totalDistance += edge.customRoute.distance;
      totalDuration += edge.customRoute.duration;
      if (edge.transportMode === "driving") {
        drivingDistance += edge.customRoute.distance;
        drivingDuration += edge.customRoute.duration;
      }
    }
  }

  const nonDrivingDistance = totalDistance - drivingDistance;
  const nonDrivingDuration = totalDuration - drivingDuration;

  if (totalDistance === 0) return null;

  return (
    <div className="border-t border-border pt-2 mt-2">
      <div className="text-xs font-medium mb-1">每日汇总</div>
      <div className="space-y-0.5 text-[10px] text-text-muted">
        <div>总里程: {formatDistance(totalDistance)} | 驾车: {formatDistance(drivingDistance)} | 其他: {formatDistance(nonDrivingDistance)}</div>
        <div>总耗时: {formatDuration(totalDuration)} | 驾车: {formatDuration(drivingDuration)}</div>
      </div>
    </div>
  );
}
