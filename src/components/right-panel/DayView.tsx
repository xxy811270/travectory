"use client";

import { useState } from "react";
import { useScheduleStore, usePoiStore, useUiStore, useMapStore } from "@/stores";
import { DaySummary } from "./DaySummary";
import { TimelineView } from "./TimelineView";
import { SmartComplete } from "./SmartComplete";
import { DailyNotes } from "./DailyNotes";
import type { Day, ScheduleItem, POI, POITag } from "@/types";
import { scheduleApi, dayApi } from "@/lib/api-client";

const DEFAULT_STAY_TIMES: Partial<Record<POITag, { hours: number; minutes: number }>> = {
  hotel: { hours: 10, minutes: 0 },
  restaurant: { hours: 1, minutes: 0 },
  gas_station: { hours: 0, minutes: 20 },
  normal: { hours: 1, minutes: 0 },
};

interface DayViewProps {
  day: Day;
}

export function DayView({ day }: DayViewProps) {
  const { pois } = usePoiStore();
  const getPoiById = usePoiStore((s) => s.getPoiById);
  const { updateDay, addItem, removeItem, reorderItems, updateItem, addDay, selectDay } = useScheduleStore();
  const { focusPoi } = useMapStore();
  const setDirty = useUiStore((s) => s.setDirty);
  const [showAddPoi, setShowAddPoi] = useState(false);
  const [poiSearch, setPoiSearch] = useState("");
  const [poiTagFilter, setPoiTagFilter] = useState<POITag | "all">("all");
  const [departureTime, setDepartureTime] = useState("08:00");
  const [editingStay, setEditingStay] = useState<string | null>(null);

  const availablePois = pois.filter((p) => {
    if (poiTagFilter !== "all" && p.tag !== poiTagFilter) return false;
    if (poiSearch && !p.name.toLowerCase().includes(poiSearch.toLowerCase())) return false;
    // Don't show POIs already in this day (but show if they're already added)
    return true;
  });

  const handleAddPoiToDay = async (poi: POI) => {
    const maxOrder = day.items.reduce((max, it) => Math.max(max, it.order), 0);
    const defaultStay = DEFAULT_STAY_TIMES[poi.tag] || { hours: 0, minutes: 0 };
    const created = await scheduleApi.create({
      dayId: day.id,
      poiId: poi.id,
      order: maxOrder + 1,
      arrivalTime: null,
      departureTime: null,
      stayDuration: defaultStay,
      fromEdgeId: null,
      notes: "",
    });
    addItem(created);
    setDirty(true);
    setShowAddPoi(false);

    // Auto-detect accommodation: if this is a hotel, set as day's accommodation
    if (poi.tag === "hotel") {
      updateDay(day.id, { accommodationId: poi.id });
      dayApi.update(day.id, { accommodationId: poi.id });
    }
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
    scheduleApi.delete(itemId);
    setDirty(true);
  };

  const handleMoveItem = (itemId: string, direction: "up" | "down") => {
    const items = [...day.items].sort((a, b) => a.order - b.order);
    const idx = items.findIndex((it) => it.id === itemId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= items.length) return;
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    reorderItems(day.id, items.map((it) => it.id));
    setDirty(true);
  };

  const handleSetStay = (itemId: string, hours: number, minutes: number) => {
    const stay = { hours, minutes };
    updateItem(itemId, { stayDuration: stay });
    scheduleApi.update(itemId, { stayDuration: stay });
    setEditingStay(null);
    setDirty(true);
  };

  const handleAutoAccommodation = () => {
    const lastItem = [...day.items].sort((a, b) => a.order - b.order).pop();
    if (!lastItem) return;
    const poi = getPoiById(lastItem.poiId);
    if (!poi) return;

    if (poi.tag === "hotel") {
      updateDay(day.id, { accommodationId: poi.id });
      dayApi.update(day.id, { accommodationId: poi.id });
    } else {
      // Ask user
      if (confirm(`"${poi.name}" 不是住宿点，是否将其标记为住宿点？`)) {
        // Update POI tag
        usePoiStore.getState().updatePoi(poi.id, { tag: "hotel" });
        updateDay(day.id, { accommodationId: poi.id });
        dayApi.update(day.id, { accommodationId: poi.id });
      }
    }
  };

  const accommodationPoi = day.accommodationId ? getPoiById(day.accommodationId) : null;
  const sortedItems = [...day.items].sort((a, b) => a.order - b.order);
  const lastItemIsHotel = sortedItems.length > 0 && getPoiById(sortedItems[sortedItems.length - 1].poiId)?.tag === "hotel";

  return (
    <div className="p-2 space-y-2">
      {/* Day header with departure time */}
      <div className="flex items-center gap-2">
        <input
          className="flex-1 px-2 py-1 text-sm font-medium border border-transparent hover:border-border rounded focus:border-primary focus:outline-none"
          value={day.label || `Day ${day.dayNumber}`}
          onChange={(e) => {
            updateDay(day.id, { label: e.target.value });
            setDirty(true);
          }}
        />
        <div className="flex items-center gap-1 text-xs">
          <span className="text-text-muted">出发</span>
          <input
            type="time"
            className="w-16 px-1 py-0.5 border border-border rounded text-xs"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
          />
        </div>
        <button
          className="text-xs px-2 py-1 border border-border rounded hover:bg-gray-50"
          onClick={() => setShowAddPoi(!showAddPoi)}
        >
          + POI
        </button>
      </div>

      {/* Accommodation badge */}
      {accommodationPoi && (
        <div className="text-[10px] bg-red-50 text-danger px-2 py-1 rounded flex items-center gap-1">
          🏨 住宿: {accommodationPoi.name}
        </div>
      )}

      {/* POI picker popover */}
      {showAddPoi && (
        <div className="border border-border rounded-lg bg-surface shadow-lg p-3 space-y-2 z-30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">选择 POI 加入日程</span>
            <button className="text-xs text-text-muted hover:text-text" onClick={() => setShowAddPoi(false)}>✕</button>
          </div>

          {/* Search + tag filter */}
          <input
            className="w-full px-2 py-1 text-xs border border-border rounded"
            placeholder="搜索 POI 名称..."
            value={poiSearch}
            onChange={(e) => setPoiSearch(e.target.value)}
            autoFocus
          />
          <div className="flex gap-1 flex-wrap">
            <button className={`text-[10px] px-1.5 py-0.5 rounded ${poiTagFilter === "all" ? "bg-primary text-white" : "bg-gray-100"}`}
              onClick={() => setPoiTagFilter("all")}>全部</button>
            <button className={`text-[10px] px-1.5 py-0.5 rounded ${poiTagFilter === "normal" ? "bg-primary text-white" : "bg-gray-100"}`}
              onClick={() => setPoiTagFilter("normal")}>📍普通</button>
            <button className={`text-[10px] px-1.5 py-0.5 rounded ${poiTagFilter === "hotel" ? "bg-primary text-white" : "bg-gray-100"}`}
              onClick={() => setPoiTagFilter("hotel")}>🏨住宿</button>
            <button className={`text-[10px] px-1.5 py-0.5 rounded ${poiTagFilter === "restaurant" ? "bg-primary text-white" : "bg-gray-100"}`}
              onClick={() => setPoiTagFilter("restaurant")}>🍽餐饮</button>
            <button className={`text-[10px] px-1.5 py-0.5 rounded ${poiTagFilter === "gas_station" ? "bg-primary text-white" : "bg-gray-100"}`}
              onClick={() => setPoiTagFilter("gas_station")}>⛽加油</button>
          </div>

          {/* POI list */}
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {availablePois.length === 0 ? (
              <div className="text-xs text-text-muted text-center py-3">无匹配 POI</div>
            ) : (
              availablePois.map((poi) => {
                const defaultStay = DEFAULT_STAY_TIMES[poi.tag];
                const alreadyIn = day.items.some((it) => it.poiId === poi.id);
                return (
                  <div
                    key={poi.id}
                    className={`text-xs p-2 rounded cursor-pointer flex items-center justify-between transition-colors ${
                      alreadyIn ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleAddPoiToDay(poi)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span>{poi.tag === "hotel" ? "🏨" : poi.tag === "restaurant" ? "🍽" : poi.tag === "gas_station" ? "⛽" : "📍"}</span>
                      <span className="truncate">{poi.name}</span>
                      {alreadyIn && <span className="text-[10px] text-primary shrink-0">已添加</span>}
                    </div>
                    <span className="text-text-muted shrink-0 ml-1">
                      {defaultStay && (defaultStay.hours > 0 || defaultStay.minutes > 0)
                        ? `${defaultStay.hours > 0 ? defaultStay.hours + "h" : ""}${defaultStay.minutes}m`
                        : "+"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Schedule items */}
      {sortedItems.length === 0 ? (
        <div className="text-xs text-text-muted text-center py-4">
          尚未添加 POI 到这天
        </div>
      ) : (
        <div className="space-y-1">
          {sortedItems.map((item, idx) => {
            const poi = getPoiById(item.poiId);
            const isHotel = poi?.tag === "hotel";
            const stayH = item.stayDuration?.hours || 0;
            const stayM = item.stayDuration?.minutes || 0;
            const hasStay = stayH > 0 || stayM > 0;

            return (
              <div
                key={item.id}
                className={`border rounded p-2 group ${isHotel ? "border-red-300 bg-red-50/30" : "border-border hover:border-primary/50"}`}
              >
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col">
                    <button className="text-[10px] leading-none text-text-muted hover:text-text disabled:opacity-30"
                      onClick={() => handleMoveItem(item.id, "up")} disabled={idx === 0}>▲</button>
                    <button className="text-[10px] leading-none text-text-muted hover:text-text disabled:opacity-30"
                      onClick={() => handleMoveItem(item.id, "down")} disabled={idx === sortedItems.length - 1}>▼</button>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-medium truncate cursor-pointer hover:text-primary"
                    onClick={() => poi && focusPoi(poi.lng, poi.lat)}>
                    {isHotel && "🏨 "}{poi?.name || "未命名"}
                  </span>
                  <button className="ml-auto text-[10px] text-text-muted hover:text-danger opacity-0 group-hover:opacity-100"
                    onClick={() => handleRemoveItem(item.id)}>✕</button>
                </div>

                {/* Stay duration */}
                <div className="flex items-center gap-1 mt-1 ml-8">
                  {editingStay === item.id ? (
                    <div className="flex items-center gap-1">
                      <input type="number" className="w-10 px-1 py-0.5 text-[10px] border rounded" min="0" defaultValue={stayH}
                        id={`h-${item.id}`} />
                      <span className="text-[10px]">h</span>
                      <input type="number" className="w-10 px-1 py-0.5 text-[10px] border rounded" min="0" max="59" defaultValue={stayM}
                        id={`m-${item.id}`} />
                      <span className="text-[10px]">m</span>
                      <button className="text-[10px] px-1 py-0.5 bg-primary text-white rounded"
                        onClick={() => {
                          const h = parseInt((document.getElementById(`h-${item.id}`) as HTMLInputElement)?.value || "0");
                          const m = parseInt((document.getElementById(`m-${item.id}`) as HTMLInputElement)?.value || "0");
                          handleSetStay(item.id, h, m);
                        }}>✓</button>
                    </div>
                  ) : (
                    <button className="text-[10px] text-text-muted hover:text-primary"
                      onClick={() => setEditingStay(item.id)}>
                      {hasStay ? `停留: ${stayH > 0 ? stayH + "h" : ""}${stayM}m` : "设置停留时间"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Auto-accommodation button */}
      {sortedItems.length > 0 && !day.accommodationId && (
        <button
          className="w-full py-1 text-[10px] text-text-muted border border-dashed border-border rounded hover:border-primary hover:text-primary"
          onClick={handleAutoAccommodation}
        >
          {lastItemIsHotel ? "🏨 标记为住宿点" : "⚠ 当天结束于非住宿点，点击标记"}
        </button>
      )}

      <SmartComplete day={day} />
      <DaySummary day={day} />
      <TimelineView day={day} departureTime={departureTime} />
      <DailyNotes dayId={day.id} content={day.notesContent} />
    </div>
  );
}
