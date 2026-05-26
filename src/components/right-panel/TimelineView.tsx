"use client";

import { usePoiStore, useEdgeStore } from "@/stores";
import { formatDistance, formatDuration } from "@/lib/geo";
import type { Day, ScheduleItem } from "@/types";

interface TimelineViewProps {
  day: Day;
  departureTime: string; // "HH:mm"
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(time: string): string {
  return time;
}

export function TimelineView({ day, departureTime }: TimelineViewProps) {
  const getPoiById = usePoiStore((s) => s.getPoiById);
  const edges = useEdgeStore((s) => s.edges);
  const sortedItems = [...day.items].sort((a, b) => a.order - b.order);

  if (sortedItems.length === 0) return null;

  let currentTime = departureTime || "08:00";
  const rows: Array<{
    type: "poi" | "transit";
    item?: ScheduleItem;
    fromPoi?: string;
    toPoi?: string;
    time: string;
    endTime?: string;
    label: string;
    detail: string;
    distance: number;
    duration: number;
    warning: boolean;
  }> = [];

  for (let i = 0; i < sortedItems.length; i++) {
    const item = sortedItems[i];
    const poi = getPoiById(item.poiId);
    const stayMin = (item.stayDuration?.hours || 0) * 60 + (item.stayDuration?.minutes || 0);
    const arrivalTime = currentTime;

    // Check for late arrival
    const arrivalMinutes = timeToMinutes(arrivalTime);
    const isLate = arrivalMinutes >= 22 * 60; // After 10pm
    const isLateNight = arrivalMinutes >= 20 * 60 && arrivalMinutes < 22 * 60; // 8pm-10pm

    rows.push({
      type: "poi",
      item,
      time: arrivalTime,
      endTime: stayMin > 0 ? addMinutes(arrivalTime, stayMin) : undefined,
      label: poi?.name || "未命名",
      detail: stayMin > 0 ? `停留 ${item.stayDuration?.hours || 0}h${item.stayDuration?.minutes || 0}m` : "",
      distance: 0,
      duration: 0,
      warning: isLate || isLateNight,
    });

    if (stayMin > 0) {
      currentTime = addMinutes(currentTime, stayMin);
    }

    // Transit to next POI
    if (i < sortedItems.length - 1) {
      const nextItem = sortedItems[i + 1];
      const nextPoi = getPoiById(nextItem.poiId);

      let transitDistance = 0;
      let transitDuration = 0;
      let transitLabel = "无路线";

      if (nextItem.fromEdgeId) {
        const edge = edges.find((e) => e.id === nextItem.fromEdgeId);
        if (edge) {
          const routes = edge.drivingRoutes.length > 0 ? edge.drivingRoutes
            : edge.cyclingRoutes.length > 0 ? edge.cyclingRoutes
            : edge.walkingRoutes.length > 0 ? edge.walkingRoutes
            : [];
          const route = routes[edge.selectedRouteIndex];
          if (route) {
            transitDistance = route.distance;
            transitDuration = route.duration;
            transitLabel = `${edge.transportMode} · ${formatDistance(transitDistance)}`;
          }
        }
      }

      if (transitDuration > 0) {
        currentTime = addMinutes(currentTime, Math.round(transitDuration / 60));
      }

      const transitEndMinutes = timeToMinutes(currentTime);
      const transitLate = transitEndMinutes >= 22 * 60;

      rows.push({
        type: "transit",
        time: currentTime,
        fromPoi: poi?.name,
        toPoi: nextPoi?.name,
        label: `→ ${nextPoi?.name || "?"}`,
        detail: transitLabel,
        distance: transitDistance,
        duration: transitDuration,
        warning: transitLate,
      });
    }
  }

  return (
    <div className="mt-3 border-t border-border pt-2">
      <div className="text-xs font-medium mb-2">
        时间线 (出发 {departureTime})
      </div>
      <div className="space-y-0">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2 py-1.5 text-xs border-l-2 pl-2 ${
              row.warning ? "border-danger bg-red-50" : "border-primary/30"
            }`}
          >
            <span className={`font-mono shrink-0 w-12 ${row.warning ? "text-danger font-bold" : "text-text-muted"}`}>
              {formatTime(row.time)}
            </span>
            <div className="flex-1 min-w-0">
              {row.type === "poi" ? (
                <>
                  <span className="font-medium">{row.label}</span>
                  {row.endTime && (
                    <span className="text-text-muted ml-1">
                      → {row.endTime}
                    </span>
                  )}
                  {row.detail && <div className="text-text-muted">{row.detail}</div>}
                  {row.warning && (
                    <div className="text-danger font-medium">
                      {timeToMinutes(row.time) >= 22 * 60 ? "⚠ 深夜到达！" : "⚠ 晚间到达"}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-text-muted">
                    {row.duration > 0
                      ? `行程 ${formatDuration(row.duration)} · ${formatDistance(row.distance)}`
                      : "无路线数据"}
                  </div>
                  {row.warning && (
                    <div className="text-danger font-medium">⚠ 深夜驾驶！</div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
