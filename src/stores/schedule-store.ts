// ========== Schedule Store ==========
import { create } from "zustand";
import type { Day, ScheduleItem, StayDuration, DaySummary, SmartCompleteResult } from "@/types";

interface ScheduleStore {
  days: Day[];
  selectedDayId: string | null;
  selectedItemId: string | null;

  // Day actions
  setDays: (days: Day[]) => void;
  addDay: (day: Day) => void;
  updateDay: (id: string, updates: Partial<Day>) => void;
  removeDay: (id: string) => void;
  selectDay: (id: string | null) => void;
  reorderDays: (dayIds: string[]) => void;

  // Schedule item actions
  addItem: (item: ScheduleItem) => void;
  updateItem: (id: string, updates: Partial<ScheduleItem>) => void;
  removeItem: (id: string) => void;
  selectItem: (id: string | null) => void;
  reorderItems: (dayId: string, itemIds: string[]) => void;

  // Computed
  getDaySummary: (dayId: string) => DaySummary;
  getDaysForPoi: (poiId: string) => Array<{ day: Day; item: ScheduleItem }>;
  smartComplete: (dayId: string) => SmartCompleteResult;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  days: [],
  selectedDayId: null,
  selectedItemId: null,

  setDays: (days) => set({ days }),

  addDay: (day) =>
    set((s) => ({
      days: [...s.days, day].sort((a, b) => a.dayNumber - b.dayNumber),
    })),

  updateDay: (id, updates) =>
    set((s) => ({
      days: s.days.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),

  removeDay: (id) =>
    set((s) => ({
      days: s.days.filter((d) => d.id !== id),
      selectedDayId: s.selectedDayId === id ? null : s.selectedDayId,
    })),

  selectDay: (id) => set({ selectedDayId: id }),

  reorderDays: (dayIds) =>
    set((s) => {
      const reordered = dayIds
        .map((id, i) => {
          const day = s.days.find((d) => d.id === id);
          return day ? { ...day, dayNumber: i + 1 } : null;
        })
        .filter(Boolean) as Day[];
      return { days: reordered };
    }),

  addItem: (item) =>
    set((s) => ({
      days: s.days.map((d) =>
        d.id === item.dayId ? { ...d, items: [...d.items, item] } : d
      ),
    })),

  updateItem: (id, updates) =>
    set((s) => ({
      days: s.days.map((d) => ({
        ...d,
        items: d.items.map((it) => (it.id === id ? { ...it, ...updates } : it)),
      })),
    })),

  removeItem: (id) =>
    set((s) => ({
      days: s.days.map((d) => ({
        ...d,
        items: d.items.filter((it) => it.id !== id),
      })),
      selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
    })),

  selectItem: (id) => set({ selectedItemId: id }),

  reorderItems: (dayId, itemIds) =>
    set((s) => ({
      days: s.days.map((d) => {
        if (d.id !== dayId) return d;
        const items = itemIds
          .map((id, i) => {
            const item = d.items.find((it) => it.id === id);
            return item ? { ...item, order: i } : null;
          })
          .filter(Boolean) as ScheduleItem[];
        return { ...d, items };
      }),
    })),

  getDaySummary: (dayId) => {
    const day = get().days.find((d) => d.id === dayId);
    if (!day) return { totalDistance: 0, drivingDistance: 0, nonDrivingDistance: 0, totalDuration: 0, drivingDuration: 0, nonDrivingDuration: 0 };
    // Summaries need edge data — computed in the hook layer
    return { totalDistance: 0, drivingDistance: 0, nonDrivingDistance: 0, totalDuration: 0, drivingDuration: 0, nonDrivingDuration: 0 };
  },

  getDaysForPoi: (poiId) => {
    const result: Array<{ day: Day; item: ScheduleItem }> = [];
    for (const day of get().days) {
      for (const item of day.items) {
        if (item.poiId === poiId) {
          result.push({ day, item });
        }
      }
    }
    return result;
  },

  smartComplete: (_dayId) => {
    return { detectedEdges: [], warnings: [] };
  },
}));
