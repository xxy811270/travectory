"use client";

import { useEffect, useRef } from "react";
import { useEdgeStore, usePoiStore, useUiStore } from "@/stores";
import { TRANSPORT_COLORS } from "@/types";
import { formatDistance } from "@/lib/geo";
import { getMapInstance } from "@/hooks/use-map-instance";

export function EdgePolylineLayer() {
  const edges = useEdgeStore((s) => s.filteredEdges());
  const selectEdge = useEdgeStore((s) => s.selectEdge);
  const showDistanceLabels = useUiStore((s) => s.showDistanceLabels);
  const polylinesRef = useRef<Map<string, unknown>>(new Map());

  useEffect(() => {
    const map = getMapInstance() as Record<string, unknown> | null;
    if (!map || !window.AMap) return;

    const AMap = window.AMap as Record<string, unknown>;
    const Polyline = AMap.Polyline as new (opts: Record<string, unknown>) => unknown;
    const Text = AMap.Text as new (opts: Record<string, unknown>) => unknown | undefined;

    // Clear existing
    polylinesRef.current.forEach((pl) => {
      const p = pl as { setMap?: (map: null) => void };
      p.setMap?.(null);
    });
    polylinesRef.current.clear();

    edges.forEach((edge) => {
      const color = TRANSPORT_COLORS[edge.transportMode] || "#999";
      const isCustom = ["train", "flight", "ferry"].includes(edge.transportMode);

      // Get route path
      let path: [number, number][] | null = null;
      let distance = 0;

      if (isCustom && edge.customRoute) {
        path = edge.customRoute.polyline;
        distance = edge.customRoute.distance;
      } else {
        const routes = edge.transportMode === "driving"
          ? edge.drivingRoutes
          : edge.transportMode === "cycling"
          ? edge.cyclingRoutes
          : edge.transportMode === "walking"
          ? edge.walkingRoutes
          : [];

        if (routes.length > 0) {
          const route = routes[edge.selectedRouteIndex] || routes[0];
          path = route.polyline;
          distance = route.distance;
        } else {
          // Fallback: draw straight line between POIs
          const origin = usePoiStore.getState().getPoiById(edge.originId);
          const dest = usePoiStore.getState().getPoiById(edge.destinationId);
          if (origin && dest) {
            path = [[origin.lng, origin.lat], [dest.lng, dest.lat]];
          }
        }
      }

      if (!path || path.length < 2) return;

      // Create polyline
      const polyline = new Polyline({
        path,
        strokeColor: color,
        strokeWeight: isCustom ? 2 : 4,
        strokeOpacity: 0.8,
        strokeStyle: isCustom ? "dashed" : "solid",
        lineJoin: "round",
        lineCap: "round",
        zIndex: 50,
        // Dashed for custom routes
        ...(isCustom ? { strokeDasharray: [10, 5] } : {}),
      });

      const polylineWithMap = polyline as { setMap?: (map: unknown) => void; on?: (e: string, cb: () => void) => void };
      polylineWithMap.setMap?.(map);
      polylineWithMap.on?.("click", () => {
        selectEdge(edge.id);
      });
      polylinesRef.current.set(`line-${edge.id}`, polyline);

      // Distance label
      if (showDistanceLabels && distance > 0 && path.length >= 2) {
        const midIdx = Math.floor(path.length / 2);
        const midPoint = path[midIdx];

        if (Text) {
          const text = new Text({
            text: formatDistance(distance),
            position: midPoint,
            style: {
              "background-color": "rgba(255,255,255,0.8)",
              "border": "1px solid " + color,
              "font-size": "10px",
              "padding": "1px 4px",
              "border-radius": "3px",
              "color": color,
            },
          });
          const textWithMap = text as { setMap?: (map: unknown) => void };
          textWithMap.setMap?.(map);
          polylinesRef.current.set(`label-${edge.id}`, text);
        }
      }
    });

    return () => {
      polylinesRef.current.forEach((obj) => {
        const o = obj as { setMap?: (map: null) => void };
        o.setMap?.(null);
      });
      polylinesRef.current.clear();
    };
  }, [edges, showDistanceLabels]);

  return null;
}
