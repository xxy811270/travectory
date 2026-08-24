"use client";

import { useScheduleStore, useUiStore } from "@/stores";
import { DayView } from "./DayView";
import { TripSummary } from "./TripSummary";
import { dayApi, scheduleApi } from "@/lib/api-client";
import { useState } from "react";
import { toast } from "sonner";

export function RightPanel() {
  const { days, setDays, selectDay, selectedDayId, removeDay } = useScheduleStore();
  const setDirty = useUiStore((s) => s.setDirty);
  const [isMutatingDays, setIsMutatingDays] = useState(false);
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber);

  const handleAddDay = async (insertAt: number) => {
    if (isMutatingDays) return;
    const previousAccommodationId = insertAt > 1
      ? sortedDays[insertAt - 2]?.accommodationId || null
      : null;

    setIsMutatingDays(true);
    try {
      const created = await dayApi.create({
        projectId: "default",
        insertAt,
        date: null,
        label: `第 ${insertAt} 天`,
        accommodationId: previousAccommodationId,
        notesContent: "",
        notesMentions: [],
      });

      if (previousAccommodationId) {
        await scheduleApi.create({
          dayId: created.id,
          poiId: previousAccommodationId,
          order: 0,
          arrivalTime: null,
          departureTime: "08:00",
          stayDuration: { hours: 0, minutes: 0 },
          fromEdgeId: null,
          notes: "从住宿点出发",
        });
      }

      setDays(await dayApi.list());
      selectDay(created.id);
      setDirty(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "新增日程失败");
    } finally {
      setIsMutatingDays(false);
    }
  };

  const handleMoveDay = async (dayId: string, direction: "left" | "right") => {
    if (isMutatingDays) return;
    const ordered = [...sortedDays];
    const index = ordered.findIndex((day) => day.id === dayId);
    const nextIndex = direction === "left" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];

    setIsMutatingDays(true);
    try {
      setDays(await dayApi.reorder(ordered.map((day) => day.id)));
      setDirty(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "调整日程顺序失败");
    } finally {
      setIsMutatingDays(false);
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    const day = days.find((d) => d.id === dayId);
    if (!day) return;
    if (!confirm(`确定删除"${day.label || `Day ${day.dayNumber}`}"及其所有日程项吗？`)) return;

    try {
      setIsMutatingDays(true);
      await dayApi.delete(dayId);
      removeDay(dayId);
      setDays(await dayApi.list());
      setDirty(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除日程失败");
    } finally {
      setIsMutatingDays(false);
    }
  };

  const selectedDay = days.find((d) => d.id === selectedDayId);

  return (
    <div className="h-full bg-surface overflow-hidden flex flex-col">
      {/* Day tabs */}
      <div className="flex border-b border-border shrink-0 overflow-x-auto items-end">
        {sortedDays.map((day, index) => (
          <div key={day.id} className="shrink-0 flex items-center group">
            <button
              className="w-4 py-2 text-[11px] text-text-muted hover:text-primary disabled:opacity-30"
              onClick={() => handleAddDay(index + 1)}
              disabled={isMutatingDays}
              title={`在 Day ${index + 1} 前插入新日程`}
            >
              +
            </button>
            <button
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                selectedDayId === day.id
                  ? "text-primary border-primary"
                  : "text-text-muted border-transparent hover:text-text"
              }`}
              onClick={() => selectDay(day.id)}
            >
              Day {day.dayNumber}
            </button>
            <div className="hidden group-hover:flex items-center">
              <button
                className="px-0.5 py-2 text-[10px] text-text-muted hover:text-primary disabled:opacity-25"
                onClick={() => handleMoveDay(day.id, "left")}
                disabled={index === 0 || isMutatingDays}
                title="向前移动一天"
              >◀</button>
              <button
                className="px-0.5 py-2 text-[10px] text-text-muted hover:text-primary disabled:opacity-25"
                onClick={() => handleMoveDay(day.id, "right")}
                disabled={index === sortedDays.length - 1 || isMutatingDays}
                title="向后移动一天"
              >▶</button>
            </div>
            <button
              className="pr-1.5 py-2 text-[10px] text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); handleDeleteDay(day.id); }}
              title="删除这天"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          className="shrink-0 px-2 py-2 text-xs text-text-muted hover:text-primary font-bold"
          onClick={() => handleAddDay(sortedDays.length + 1)}
          disabled={isMutatingDays}
          title="在末尾新增日程"
        >
          + 新天
        </button>
      </div>

      {/* Day content */}
      <div className="flex-1 overflow-y-auto">
        {selectedDay ? (
          <DayView day={selectedDay} />
        ) : (
          <div className="p-4 text-center text-sm text-text-muted">
            {days.length === 0
              ? "点击 + 新天 创建第一天行程"
              : "选择一个日程天"}
          </div>
        )}
      </div>
      <TripSummary />
    </div>
  );
}
