// ========== Map Store ==========
import { create } from "zustand";

interface MapStore {
  center: [number, number]; // [lng, lat]
  zoom: number;
  showDayOverlay: boolean;
  selectedDayColors: Record<string, string>;

  // Actions
  setCenter: (lng: number, lat: number) => void;
  setZoom: (zoom: number) => void;
  setShowDayOverlay: (show: boolean) => void;
  focusPoi: (lng: number, lat: number) => void;
}

const DAY_COLORS = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
  "#f97316", "#6366f1",
];

export const useMapStore = create<MapStore>((set) => ({
  // Default: China center
  center: [104.0, 35.0],
  zoom: 5,
  showDayOverlay: false,
  selectedDayColors: {},

  setCenter: (lng, lat) => set({ center: [lng, lat] }),

  setZoom: (zoom) => set({ zoom }),

  setShowDayOverlay: (show) => set({ showDayOverlay: show }),

  focusPoi: (lng, lat) => set({ center: [lng, lat], zoom: 14 }),
}));

export function getDayColor(index: number): string {
  return DAY_COLORS[index % DAY_COLORS.length];
}
