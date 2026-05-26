"use client";

import { useState, useRef } from "react";
import { useAmapLoader } from "@/hooks/use-amap-loader";
import { useMapInstance } from "@/hooks/use-map-instance";
import { POIMarkerLayer } from "./POIMarkerLayer";
import { EdgePolylineLayer } from "./EdgePolylineLayer";
import { DayScheduleOverlay } from "./DayScheduleOverlay";
import { POIEditor } from "@/components/left-panel/POIEditor";

export function MapCanvas() {
  const containerId = "amap-container";
  const { loaded, loading, error, AMap } = useAmapLoader();
  const { map, focusOn } = useMapInstance(AMap, containerId);
  const [clickedPos, setClickedPos] = useState<{ lng: number; lat: number } | null>(null);
  const clickSetupRef = useRef(false);

  // Setup map click handler once map is created
  if (loaded && map && !clickSetupRef.current) {
    clickSetupRef.current = true;
    const mapWithEvents = map as { on?: (event: string, cb: (e: { lnglat: { lng: number; lat: number } }) => void) => void };
    mapWithEvents.on?.("click", (e) => {
      const { lng, lat } = e.lnglat;
      setClickedPos({ lng, lat });
    });
  }

  return (
    <div className="relative w-full h-full">
      <div id={containerId} className="absolute inset-0" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-text-muted">加载地图中...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center text-danger p-4">
            <p className="font-medium">地图加载失败</p>
            <p className="text-xs mt-1">{error.message}</p>
            <button
              className="mt-3 px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark"
              onClick={() => window.location.reload()}
            >
              重试
            </button>
          </div>
        </div>
      )}

      {/* Map layers */}
      {loaded && (
        <>
          <POIMarkerLayer />
          <EdgePolylineLayer />
          <DayScheduleOverlay />
        </>
      )}

      {/* Controls overlay */}
      {loaded && (
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <button
            className="w-8 h-8 bg-white rounded shadow hover:bg-gray-50 flex items-center justify-center text-xs"
            onClick={() => focusOn(104.0, 35.0, 5)}
            title="回到全国视图"
          >
            🏠
          </button>
          <div className="text-[10px] text-text-muted bg-white/80 rounded shadow px-1 py-0.5 text-center">
            点击地图添加POI
          </div>
        </div>
      )}

      {/* POI Editor for map click */}
      {clickedPos && (
        <POIEditor
          initialLng={clickedPos.lng}
          initialLat={clickedPos.lat}
          onClose={() => setClickedPos(null)}
        />
      )}
    </div>
  );
}
