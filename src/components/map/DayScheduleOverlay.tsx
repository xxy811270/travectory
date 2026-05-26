"use client";

import { useEffect, useRef } from "react";
import { useScheduleStore, useEdgeStore, usePoiStore, useUiStore } from "@/stores";
import { getMapInstance } from "@/hooks/use-map-instance";
import { getDayColor } from "@/stores/map-store";

export function DayScheduleOverlay() {
  const days = useScheduleStore((s) => s.days);
  const edges = useEdgeStore((s) => s.edges);
  const getPoiById = usePoiStore((s) => s.getPoiById);
  const showDayOverlay = useUiStore((s) => s.showDayOverlay);
  const overlaysRef = useRef<Map<string, unknown[]>>(new Map());

  useEffect(() => {
    const map = getMapInstance() as Record<string, unknown> | null;
    if (!map || !window.AMap) return;

    // Clear existing overlays
    overlaysRef.current.forEach((objs) => {
      objs.forEach((o) => {
        const obj = o as { setMap?: (map: null) => void };
        obj.setMap?.(null);
      });
    });
    overlaysRef.current.clear();

    if (!showDayOverlay) return;

    const AMap = window.AMap;
    const Polyline = AMap.Polyline;
    const Marker = AMap.Marker;

    days.forEach((day, dayIndex) => {
      const color = getDayColor(dayIndex);
      const items = [...day.items].sort((a, b) => a.order - b.order);
      const dayObjects: unknown[] = [];

      // Draw route segments between consecutive items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const poi = getPoiById(item.poiId);
        if (!poi) continue;

        // Numbered marker for this POI
        const markerContent = `<div style="background:${color};color:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">${day.dayNumber}</div>`;

        const marker = new Marker({
          position: [poi.lng, poi.lat],
          content: markerContent,
          offset: new AMap.Pixel(-11, -11),
          zIndex: 90,
        });
        const markerWithMap = marker as { setMap?: (map: unknown) => void };
        markerWithMap.setMap?.(map);
        dayObjects.push(marker);

        // Draw edge route if exists
        if (i > 0 && item.fromEdgeId) {
          const edge = edges.find((e) => e.id === item.fromEdgeId);
          if (edge) {
            const routes = edge.drivingRoutes.length > 0
              ? edge.drivingRoutes
              : edge.cyclingRoutes.length > 0
              ? edge.cyclingRoutes
              : edge.walkingRoutes.length > 0
              ? edge.walkingRoutes
              : [];

            const route = routes[edge.selectedRouteIndex];
            if (route?.polyline.length) {
              const polyline = new Polyline({
                path: route.polyline,
                strokeColor: color,
                strokeWeight: 5,
                strokeOpacity: 0.7,
                strokeStyle: "solid",
                lineJoin: "round",
                zIndex: 55,
              });
              const plWithMap = polyline as { setMap?: (map: unknown) => void };
              plWithMap.setMap?.(map);
              dayObjects.push(polyline);
            }
          }
        }
      }

      overlaysRef.current.set(day.id, dayObjects);
    });

    return () => {
      overlaysRef.current.forEach((objs) => {
        objs.forEach((o) => {
          const obj = o as { setMap?: (map: null) => void };
          obj.setMap?.(null);
        });
      });
      overlaysRef.current.clear();
    };
  }, [days, edges, getPoiById, showDayOverlay]);

  return null;
}
