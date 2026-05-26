"use client";

import { useScheduleStore, useUiStore } from "@/stores";
import { DayView } from "./DayView";
import { dayApi } from "@/lib/api-client";

export function RightPanel() {
  const { days, addDay, selectDay, selectedDayId, removeDay } = useScheduleStore();
  const setDirty = useUiStore((s) => s.setDirty);

  const handleAddDay = async () => {
    const nextNumber = days.length + 1;

    let previousAccommodationId: string | null = null;
    if (days.length > 0) {
      previousAccommodationId = days[days.length - 1].accommodationId;
    }

    const created = await dayApi.create({
      projectId: "default",
      dayNumber: nextNumber,
      date: null,
      label: `第 ${nextNumber} 天`,
      accommodationId: previousAccommodationId,
      notesContent: "",
      notesMentions: [],
    });
    addDay(created);

    if (previousAccommodationId) {
      const { scheduleApi } = await import("@/lib/api-client");
      const item = await scheduleApi.create({
        dayId: created.id,
        poiId: previousAccommodationId,
        order: 0,
        arrivalTime: null,
        departureTime: "08:00",
        stayDuration: { hours: 0, minutes: 0 },
        fromEdgeId: null,
        notes: "从住宿点出发",
      });
      useScheduleStore.getState().addItem(item);
    }

    selectDay(created.id);
    setDirty(true);
  };

  const handleDeleteDay = async (dayId: string) => {
    const day = days.find((d) => d.id === dayId);
    if (!day) return;
    if (!confirm(`确定删除"${day.label || `Day ${day.dayNumber}`}"及其所有日程项吗？`)) return;

    try {
      await dayApi.delete(dayId);
    } catch { /* ok */ }
    removeDay(dayId);
    setDirty(true);
  };

  const selectedDay = days.find((d) => d.id === selectedDayId);

  return (
    <div className="h-full bg-surface overflow-hidden flex flex-col">
      {/* Day tabs */}
      <div className="flex border-b border-border shrink-0 overflow-x-auto items-end">
        {days.map((day) => (
          <div key={day.id} className="shrink-0 flex items-center group">
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
          onClick={handleAddDay}
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
    </div>
  );
}
