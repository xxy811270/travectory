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
  "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899",
  "#f97316", "#84cc16", "#06b6d4", "#dc2626", "#a855f7",
  "#14b8a6", "#e11d48", "#22c55e", "#eab308", "#d946ef",
  "#0891b2", "#7c3aed", "#65a30d", "#c2410c", "#ca8a04",
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
