// ========== POI Store ==========
import { create } from "zustand";
import type { POI, POITag, POICreateInput } from "@/types";

interface POIStore {
  pois: POI[];
  selectedPoiId: string | null;
  filterTag: POITag | "all";
  searchQuery: string;

  // Actions
  setPois: (pois: POI[]) => void;
  addPoi: (poi: POI) => void;
  updatePoi: (id: string, updates: Partial<POI>) => void;
  removePoi: (id: string) => void;
  selectPoi: (id: string | null) => void;
  setFilterTag: (tag: POITag | "all") => void;
  setSearchQuery: (query: string) => void;

  // Computed
  filteredPois: () => POI[];
  getPoiById: (id: string) => POI | undefined;
}

export const usePoiStore = create<POIStore>((set, get) => ({
  pois: [],
  selectedPoiId: null,
  filterTag: "all",
  searchQuery: "",

  setPois: (pois) => set({ pois }),

  addPoi: (poi) => set((s) => ({ pois: [...s.pois, poi] })),

  updatePoi: (id, updates) =>
    set((s) => ({
      pois: s.pois.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  removePoi: (id) =>
    set((s) => ({
      pois: s.pois.filter((p) => p.id !== id),
      selectedPoiId: s.selectedPoiId === id ? null : s.selectedPoiId,
    })),

  selectPoi: (id) => set({ selectedPoiId: id }),

  setFilterTag: (tag) => set({ filterTag: tag }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  filteredPois: () => {
    const { pois, filterTag, searchQuery } = get();
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
  },

  getPoiById: (id) => get().pois.find((p) => p.id === id),
}));
