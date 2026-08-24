"use client";

import { useMemo, useState } from "react";
import { usePoiStore, useMapStore, useUiStore } from "@/stores";
import { POI_TAG_LABELS, POI_TAG_COLORS } from "@/types";
import type { POI } from "@/types";
import { POIEditor } from "./POIEditor";
import { poiApi } from "@/lib/api-client";

export function POIList() {
  const pois = usePoiStore((s) => s.pois);
  const filterTag = usePoiStore((s) => s.filterTag);
  const searchQuery = usePoiStore((s) => s.searchQuery);
  const selectPoi = usePoiStore((s) => s.selectPoi);
  const removePoi = usePoiStore((s) => s.removePoi);
  const selectedPoiId = usePoiStore((s) => s.selectedPoiId);
  const focusPoi = useMapStore((s) => s.focusPoi);
  const setDirty = useUiStore((s) => s.setDirty);
  const [editingPoi, setEditingPoi] = useState<POI | null>(null);

  const filteredPois = useMemo(() => {
    let result = pois;
    if (filterTag !== "all") result = result.filter((p) => p.tag === filterTag);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
    }
    return result;
  }, [pois, filterTag, searchQuery]);

  const handleDelete = async (poi: POI, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`删除 "${poi.name}"？关联的边也会被删除。`)) return;
    try { await poiApi.delete(poi.id); } catch { /* ok */ }
    removePoi(poi.id);
    setDirty(true);
  };

  if (filteredPois.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-text-muted">
        暂无 POI 节点<br/>点击下方按钮或地图添加
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {filteredPois.map((poi) => {
        const isSel = selectedPoiId === poi.id;
        return (
          <div
            key={poi.id}
            className={`group flex items-start gap-2 p-2.5 cursor-pointer transition-colors ${
              isSel ? "bg-blue-50 border-l-2 border-primary" : "border-l-2 border-transparent hover:bg-gray-50"
            }`}
            onClick={() => { selectPoi(poi.id); focusPoi(poi.lng, poi.lat); }}
          >
            <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: POI_TAG_COLORS[poi.tag] }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{poi.name}</span>
                <span className="text-[10px] px-1 py-0.5 rounded shrink-0" style={{ backgroundColor: POI_TAG_COLORS[poi.tag] + "20", color: POI_TAG_COLORS[poi.tag] }}>
                  {POI_TAG_LABELS[poi.tag]}
                </span>
              </div>
              {poi.address && <div className="text-xs text-text-muted mt-0.5 truncate">{poi.address}</div>}
            </div>
            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="w-5 h-5 flex items-center justify-center text-[10px] text-text-muted hover:text-primary hover:bg-blue-50 rounded"
                onClick={(e) => { e.stopPropagation(); setEditingPoi(poi); }}
                title="编辑"
              >✎</button>
              <button
                className="w-5 h-5 flex items-center justify-center text-[10px] text-text-muted hover:text-danger hover:bg-red-50 rounded"
                onClick={(e) => handleDelete(poi, e)}
                title="删除"
              >✕</button>
            </div>
          </div>
        );
      })}
      {editingPoi && <POIEditor key={`edit-${editingPoi.id}`} poi={editingPoi} onClose={() => setEditingPoi(null)} />}
    </div>
  );
}
