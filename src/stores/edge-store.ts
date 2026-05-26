// ========== Edge Store ==========
import { create } from "zustand";
import type { Edge, EdgeCreateInput, TransportMode, RoutePath } from "@/types";

interface EdgeStore {
  edges: Edge[];
  selectedEdgeId: string | null;
  filterMode: TransportMode | "all";

  // Actions
  setEdges: (edges: Edge[]) => void;
  addEdge: (edge: Edge) => void;
  updateEdge: (id: string, updates: Partial<Edge>) => void;
  removeEdge: (id: string) => void;
  selectEdge: (id: string | null) => void;
  setFilterMode: (mode: TransportMode | "all") => void;

  // Route management
  addRouteToEdge: (edgeId: string, route: RoutePath, mode: TransportMode) => void;
  setSelectedRouteIndex: (edgeId: string, index: number) => void;

  // Queries
  findEdgeBetween: (originId: string, destId: string) => Edge | undefined;
  findAllEdgesBetween: (originId: string, destId: string) => Edge[];
  getEdgesForPoi: (poiId: string) => Edge[];
  filteredEdges: () => Edge[];
}

export const useEdgeStore = create<EdgeStore>((set, get) => ({
  edges: [],
  selectedEdgeId: null,
  filterMode: "all",

  setEdges: (edges) => set({ edges }),

  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),

  updateEdge: (id, updates) =>
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),

  removeEdge: (id) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
    })),

  selectEdge: (id) => set({ selectedEdgeId: id }),

  setFilterMode: (mode) => set({ filterMode: mode }),

  addRouteToEdge: (edgeId, route, mode) =>
    set((s) => ({
      edges: s.edges.map((e) => {
        if (e.id !== edgeId) return e;
        if (mode === "driving") return { ...e, drivingRoutes: [...e.drivingRoutes, route] };
        if (mode === "cycling") return { ...e, cyclingRoutes: [...e.cyclingRoutes, route] };
        if (mode === "walking") return { ...e, walkingRoutes: [...e.walkingRoutes, route] };
        return e;
      }),
    })),

  setSelectedRouteIndex: (edgeId, index) =>
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === edgeId ? { ...e, selectedRouteIndex: index } : e
      ),
    })),

  findEdgeBetween: (originId, destId) =>
    get().edges.find(
      (e) =>
        (e.originId === originId && e.destinationId === destId) ||
        (e.originId === destId && e.destinationId === originId)
    ),

  findAllEdgesBetween: (originId, destId) =>
    get().edges.filter(
      (e) =>
        (e.originId === originId && e.destinationId === destId) ||
        (e.originId === destId && e.destinationId === originId)
    ),

  getEdgesForPoi: (poiId) =>
    get().edges.filter(
      (e) => e.originId === poiId || e.destinationId === poiId
    ),

  filteredEdges: () => {
    const { edges, filterMode } = get();
    if (filterMode === "all") return edges;
    return edges.filter((e) => e.transportMode === filterMode);
  },
}));
