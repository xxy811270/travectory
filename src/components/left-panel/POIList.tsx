"use client";

import { useMemo } from "react";
import { usePoiStore, useMapStore } from "@/stores";
import { POI_TAG_LABELS, POI_TAG_COLORS } from "@/types";
import type { POI } from "@/types";
import { POIEditor } from "./POIEditor";
import { useState } from "react";

export function POIList() {
  const pois = usePoiStore((s) => s.pois);
  const filterTag = usePoiStore((s) => s.filterTag);
  const searchQuery = usePoiStore((s) => s.searchQuery);
  const selectPoi = usePoiStore((s) => s.selectPoi);
  const selectedPoiId = usePoiStore((s) => s.selectedPoiId);
  const focusPoi = useMapStore((s) => s.focusPoi);
  const [editingPoi, setEditingPoi] = useState<POI | null>(null);

  const filteredPois = useMemo(() => {
    let result = pois;
    if (filterTag !== "all") {
      result = result.filter((p) => p.tag === filterTag);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q)
      );
    }
    return result;
  }, [pois, filterTag, searchQuery]);

  if (filteredPois.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-text-muted">
        暂无 POI 节点<br />
        点击下方按钮或地图添加
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {filteredPois.map((poi) => (
        <div
          key={poi.id}
          className={`p-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${
            selectedPoiId === poi.id ? "bg-blue-50 border-l-2 border-primary" : "border-l-2 border-transparent"
          }`}
          onClick={() => {
            selectPoi(poi.id);
            focusPoi(poi.lng, poi.lat);
          }}
          onDoubleClick={() => setEditingPoi(poi)}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: POI_TAG_COLORS[poi.tag] }}
            />
            <span className="text-sm font-medium truncate">{poi.name}</span>
            <span
              className="text-[10px] px-1 py-0.5 rounded ml-auto shrink-0"
              style={{ backgroundColor: POI_TAG_COLORS[poi.tag] + "20", color: POI_TAG_COLORS[poi.tag] }}
            >
              {POI_TAG_LABELS[poi.tag]}
            </span>
          </div>
          {poi.address && (
            <div className="text-xs text-text-muted mt-0.5 truncate ml-4">{poi.address}</div>
          )}
        </div>
      ))}
      {editingPoi && (
        <POIEditor
          poi={editingPoi}
          onClose={() => setEditingPoi(null)}
        />
      )}
    </div>
  );
}
