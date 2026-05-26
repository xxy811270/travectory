"use client";

import { useState, useCallback, useRef, useEffect } from "react";

let globalMapInstance: unknown = null;

export function getMapInstance(): unknown {
  return globalMapInstance;
}

export function useMapInstance(
  AMap: typeof window.AMap | null,
  containerId: string
) {
  const [map, setMap] = useState<unknown>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!AMap || initializedRef.current) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const mapInstance = new AMap.Map(container, {
        zoom: 5,
        center: [104.0, 35.0],
        viewMode: "2D",
        resizeEnable: true,
      });

      globalMapInstance = mapInstance;
      initializedRef.current = true;
      setMap(mapInstance);
    } catch (err) {
      console.error("Failed to create map instance:", err);
    }
  }, [AMap, containerId]);

  const focusOn = useCallback((lng: number, lat: number, zoom = 14) => {
    const m = globalMapInstance as { setZoomAndCenter?: (z: number, c: [number, number]) => void } | null;
    m?.setZoomAndCenter?.(zoom, [lng, lat]);
  }, []);

  const fitBounds = useCallback((swLng: number, swLat: number, neLng: number, neLat: number) => {
    const m = globalMapInstance as { setBounds?: (b: unknown) => void } | null;
    if (m?.setBounds && window.AMap?.Bounds) {
      const bounds = new window.AMap.Bounds([swLng, swLat], [neLng, neLat]);
      m.setBounds(bounds);
    }
  }, []);

  return { map, focusOn, fitBounds };
}
