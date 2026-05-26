"use client";

import { useEffect, useRef } from "react";
import { usePoiStore, useMapStore, useUiStore, useScheduleStore } from "@/stores";
import { POI_TAG_COLORS, POI_TAG_LABELS } from "@/types";
import type { POI } from "@/types";
import { getMapInstance } from "@/hooks/use-map-instance";

export function POIMarkerLayer() {
  const pois = usePoiStore((s) => s.pois);
  const filteredPois = usePoiStore((s) => s.filteredPois());
  const selectedPoiId = usePoiStore((s) => s.selectedPoiId);
  const selectPoi = usePoiStore((s) => s.selectPoi);
  const focusPoi = useMapStore((s) => s.focusPoi);
  const getDaysForPoi = useScheduleStore((s) => s.getDaysForPoi);
  const markersRef = useRef<Map<string, unknown>>(new Map());
  const infoWindowRef = useRef<unknown>(null);

  useEffect(() => {
    const map = getMapInstance() as Record<string, unknown> | null;
    if (!map || !window.AMap) return;

    const AMap = window.AMap as Record<string, unknown>;
    const Marker = AMap.Marker as new (opts: Record<string, unknown>) => unknown;
    const InfoWindow = AMap.InfoWindow as new (opts: Record<string, unknown>) => unknown;

    // Clear existing markers
    markersRef.current.forEach((m) => {
      const marker = m as { setMap?: (map: null) => void };
      marker.setMap?.(null);
    });
    markersRef.current.clear();

    // Update to show only filtered POIs
    const displayPois = filteredPois.length > 0 ? filteredPois : pois;

    displayPois.forEach((poi) => {
      const isHotel = poi.tag === "hotel";
      const color = POI_TAG_COLORS[poi.tag] || "#3b82f6";

      const markerContent = isHotel
        ? `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">🏨</div>`
        : `<div style="background:${color};color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">📍</div>`;

      const isSelected = poi.id === selectedPoiId;

      const marker = new Marker({
        position: [poi.lng, poi.lat],
        content: markerContent,
        offset: new ((AMap.Pixel as new (x: number, y: number) => unknown))(isSelected ? -14 : -12, isSelected ? -16 : -12),
        zIndex: isSelected ? 200 : 100,
        title: poi.name,
      });

      // Click event
      const markerWithEvents = marker as { on?: (event: string, cb: () => void) => void };
      markerWithEvents.on?.("click", () => {
        selectPoi(poi.id);

        // Show info window
        if (infoWindowRef.current) {
          const iw = infoWindowRef.current as { close?: () => void };
          iw.close?.();
        }

        const scheduleDays = getDaysForPoi(poi.id);
        const daysInfo = scheduleDays.length > 0
          ? `<div style="font-size:10px;color:#3b82f6;margin-top:2px;">出现在: ${scheduleDays.map(d => d.day.label || `Day ${d.day.dayNumber}`).join(", ")}</div>`
          : "";

        const content = `<div style="padding:8px;min-width:180px;">
          <div style="font-weight:bold;font-size:13px;margin-bottom:4px;">${poi.name}</div>
          <div style="font-size:11px;color:#666;">${poi.address || "无地址"}</div>
          <div style="font-size:10px;color:#999;margin-top:2px;">${poi.lng.toFixed(4)}, ${poi.lat.toFixed(4)}</div>
          <div style="margin-top:4px;"><span style="font-size:10px;background:${color}20;color:${color};padding:1px 4px;border-radius:2px;">${POI_TAG_LABELS[poi.tag]}</span></div>
          ${daysInfo}
          ${poi.notes ? `<div style="font-size:10px;color:#666;margin-top:4px;">${poi.notes}</div>` : ""}
        </div>`;

        const infoWindow = new InfoWindow({
          content,
          position: [poi.lng, poi.lat],
          offset: new ((AMap.Pixel as new (x: number, y: number) => unknown))(0, -30),
        });

        const mapRef = map as { openInfoWindow?: (iw: unknown, pos: [number, number]) => void };
        mapRef.openInfoWindow?.(infoWindow, [poi.lng, poi.lat]);
        infoWindowRef.current = infoWindow;
      });

      // Drag end event
      const markerWithDrag = marker as { on?: (event: string, cb: (e: Record<string, unknown>) => void) => void };
      markerWithDrag.on?.("dragend", (e: Record<string, unknown>) => {
        const pos = e.position as { lng: number; lat: number } | undefined;
        if (pos) {
          usePoiStore.getState().updatePoi(poi.id, { lng: pos.lng, lat: pos.lat });
          useUiStore.getState().setDirty(true);
        }
      });

      // Set draggable
      const markerWithSet = marker as { setDraggable?: (d: boolean) => void };
      markerWithSet.setDraggable?.(true);

      // Add to map
      const markerWithMap = marker as { setMap?: (map: unknown) => void };
      markerWithMap.setMap?.(map);

      markersRef.current.set(poi.id, marker);
    });

    return () => {
      markersRef.current.forEach((m) => {
        const marker = m as { setMap?: (map: null) => void };
        marker.setMap?.(null);
      });
      markersRef.current.clear();
    };
  }, [pois, filteredPois, selectedPoiId, selectPoi, focusPoi]);

  // Focus on selected POI
  useEffect(() => {
    if (!selectedPoiId) return;
    const poi = pois.find((p) => p.id === selectedPoiId);
    if (poi) {
      focusPoi(poi.lng, poi.lat);
    }
  }, [selectedPoiId]);

  return null;
}
