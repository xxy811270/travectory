"use client";

import { useState } from "react";
import { useScheduleStore, usePoiStore, useUiStore, useMapStore, useEdgeStore } from "@/stores";
import { DaySummary } from "./DaySummary";
import { SmartComplete } from "./SmartComplete";
import { DailyNotes } from "./DailyNotes";
import { scheduleApi, dayApi } from "@/lib/api-client";
import { formatDuration } from "@/lib/geo";
import type { POITag } from "@/types";
import { toast } from "sonner";

const TAG_ICONS: Record<string, string> = {
  hotel: "🏨", restaurant: "🍽", gas_station: "⛽", normal: "📍",
};

interface DayViewProps {
  day: import("@/types").Day;
}

export function DayView({ day }: DayViewProps) {
  const { pois } = usePoiStore();
  const getPoiById = usePoiStore((s) => s.getPoiById);
  const { updateDay, removeItem } = useScheduleStore();
  const { focusPoi } = useMapStore();
  const setDirty = useUiStore((s) => s.setDirty);
  const [showAddPoi, setShowAddPoi] = useState(false);
  const [poiSearch, setPoiSearch] = useState("");
  const [poiTagFilter, setPoiTagFilter] = useState<POITag | "all">("all");
  const [isReordering, setIsReordering] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState(0);
  const [isAddingPoi, setIsAddingPoi] = useState(false);

  const availablePois = pois.filter((p) => {
    if (poiTagFilter !== "all" && p.tag !== poiTagFilter) return false;
    if (poiSearch && !p.name.toLowerCase().includes(poiSearch.toLowerCase())) return false;
    return true;
  });

  const handleAddPoiToDay = async (poi: import("@/types").POI) => {
    if (isAddingPoi) return;
    setIsAddingPoi(true);
    try {
      const savedDay = await scheduleApi.insertAt({
        dayId: day.id,
        poiId: poi.id,
        insertAt: insertAtIndex,
        stayDuration: null,
        fromEdgeId: null,
        notes: "",
      });
      updateDay(day.id, savedDay);
      setDirty(true);
      setShowAddPoi(false);

      if (poi.tag === "hotel") {
        updateDay(day.id, { accommodationId: poi.id });
        await dayApi.update(day.id, { accommodationId: poi.id });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "插入 POI 失败");
    } finally {
      setIsAddingPoi(false);
    }
  };

  const openPoiPicker = (index: number) => {
    setInsertAtIndex(index);
    setShowAddPoi(true);
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
    scheduleApi.delete(itemId);
    setDirty(true);
  };

  const handleMoveItem = async (itemId: string, direction: "up" | "down") => {
    if (isReordering) return;
    const items = [...day.items].sort((a, b) => a.order - b.order);
    const idx = items.findIndex((it) => it.id === itemId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= items.length) return;
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    setIsReordering(true);
    try {
      const savedDay = await scheduleApi.reorder(day.id, items.map((it) => it.id));
      updateDay(day.id, savedDay);
      setDirty(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存日程顺序失败");
    } finally {
      setIsReordering(false);
    }
  };

  const sortedItems = [...day.items].sort((a, b) => a.order - b.order);

  return (
    <div className="p-2 space-y-2">
      {/* Day header */}
      <div className="flex items-center gap-2">
        <input
          className="flex-1 px-2 py-1 text-sm font-medium border border-transparent hover:border-border rounded focus:border-primary focus:outline-none"
          value={day.label || `Day ${day.dayNumber}`}
          onChange={(e) => { updateDay(day.id, { label: e.target.value }); setDirty(true); }}
        />
        <button
          className="text-xs px-2 py-1 border border-border rounded hover:bg-gray-50"
          onClick={() => showAddPoi ? setShowAddPoi(false) : openPoiPicker(sortedItems.length)}
        >
          + POI
        </button>
      </div>

      {/* POI picker popover */}
      {showAddPoi && (
        <div className="border border-border rounded-lg bg-surface shadow-lg p-3 space-y-2 z-30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">
              选择 POI 插入到第 {insertAtIndex + 1} 位
            </span>
            <button className="text-xs text-text-muted hover:text-text" onClick={() => setShowAddPoi(false)}>✕</button>
          </div>
          <input className="w-full px-2 py-1 text-xs border border-border rounded" placeholder="搜索..." value={poiSearch} onChange={(e) => setPoiSearch(e.target.value)} autoFocus />
          <div className="flex gap-1 flex-wrap">
            {(["all","normal","hotel","restaurant","gas_station"] as const).map(t => (
              <button key={t} className={`text-[10px] px-1.5 py-0.5 rounded ${poiTagFilter===t?"bg-primary text-white":"bg-gray-100"}`}
                onClick={() => setPoiTagFilter(t)}>{t==="all"?"全部":t==="normal"?"📍普通":t==="hotel"?"🏨住宿":t==="restaurant"?"🍽餐饮":"⛽加油"}</button>
            ))}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {availablePois.length === 0 ? (
              <div className="text-xs text-text-muted text-center py-3">无匹配 POI</div>
            ) : availablePois.map(poi => (
              <div key={poi.id}
                className={`text-xs p-2 rounded cursor-pointer flex items-center justify-between ${day.items.some(it=>it.poiId===poi.id)?"bg-blue-50 hover:bg-blue-100":"hover:bg-gray-50"}`}
                onClick={() => handleAddPoiToDay(poi)}>
                <span>{TAG_ICONS[poi.tag]||"📍"} {poi.name}</span>
                {day.items.some(it=>it.poiId===poi.id) && <span className="text-[10px] text-primary">已添加</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule items */}
      {sortedItems.length === 0 ? (
        <button
          className="w-full text-xs text-text-muted text-center py-4 border border-dashed border-border rounded hover:border-primary hover:text-primary"
          onClick={() => openPoiPicker(0)}
        >
          + 添加第一个 POI
        </button>
      ) : (
        <div className="space-y-1">
          {sortedItems.map((item, idx) => {
            const poi = getPoiById(item.poiId);
            const isHotel = poi?.tag === "hotel";
            // Find edge info from this item (the edge from previous POI to this one)
            const fromEdge = item.fromEdgeId ? useEdgeStore.getState().edges.find((e: {id:string}) => e.id === item.fromEdgeId) : null;

            return (
              <div key={item.id}>
              {idx === 0 && (
                <button
                  className="w-full h-5 text-[10px] text-text-muted hover:text-primary border border-transparent hover:border-dashed hover:border-primary/50 rounded"
                  onClick={() => openPoiPicker(0)}
                >+ 在此插入 POI</button>
              )}
              <div className={`border rounded p-2 group ${isHotel ? "border-red-300 bg-red-50/30" : "border-border hover:border-primary/50"}`}>
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col">
                    <button className="text-[10px] leading-none text-text-muted hover:text-text disabled:opacity-30" onClick={()=>handleMoveItem(item.id,"up")} disabled={idx===0 || isReordering}>▲</button>
                    <button className="text-[10px] leading-none text-text-muted hover:text-text disabled:opacity-30" onClick={()=>handleMoveItem(item.id,"down")} disabled={idx===sortedItems.length-1 || isReordering}>▼</button>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center shrink-0">{idx+1}</span>
                  <span className="text-xs font-medium truncate cursor-pointer hover:text-primary" onClick={()=>poi&&focusPoi(poi.lng,poi.lat)}>
                    {isHotel&&"🏨 "}{poi?.name||"未命名"}
                  </span>
                  <button className="ml-auto text-[10px] text-text-muted hover:text-danger opacity-0 group-hover:opacity-100" onClick={()=>handleRemoveItem(item.id)}>✕</button>
                </div>
                {/* Edge info between this and previous */}
                {idx > 0 && item.fromEdgeId && (() => {
                  const edge = fromEdge;
                  if (!edge) return null;
                  const routes = edge.drivingRoutes?.length ? edge.drivingRoutes : edge.cyclingRoutes?.length ? edge.cyclingRoutes : edge.walkingRoutes || [];
                  const r = routes[edge.selectedRouteIndex||0] || routes[0];
                  const dist = r?.distance || edge.customRoute?.distance || 0;
                  const dur = r?.duration || edge.customRoute?.duration || 0;
                  const modeLabel = edge.transportMode === "driving" ? "驾车" : edge.transportMode === "cycling" ? "骑行" : edge.transportMode === "walking" ? "步行" : edge.transportMode;
                  return (
                    <div className="ml-7 text-[10px] text-text-muted mt-0.5">
                      ↑ {modeLabel} {dist > 0 ? `${(dist/1000).toFixed(1)}km` : ""} {dur > 0 ? formatDuration(dur) : ""}
                    </div>
                  );
                })()}
              </div>
              <button
                className="w-full h-5 text-[10px] text-text-muted hover:text-primary border border-transparent hover:border-dashed hover:border-primary/50 rounded"
                onClick={() => openPoiPicker(idx + 1)}
              >+ 在此插入 POI</button>
              </div>
            );
          })}
        </div>
      )}

      <SmartComplete day={day} />
      <DaySummary day={day} />
      <DailyNotes dayId={day.id} content={day.notesContent} />
    </div>
  );
}
