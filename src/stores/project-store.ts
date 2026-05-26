// ========== Project Store ==========
import { create } from "zustand";
import type { RoadbookProject, ProjectMetadata } from "@/types";

interface ProjectStore {
  name: string;
  description: string;
  shareId: string | null;

  // Actions
  setMetadata: (meta: Partial<ProjectMetadata>) => void;
  setShareId: (id: string | null) => void;

  // Serialization
  toProject: () => RoadbookProject;
  fromProject: (project: RoadbookProject) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  name: "未命名路书",
  description: "",
  shareId: null,

  setMetadata: (meta) =>
    set((s) => ({
      ...s,
      name: meta.name ?? s.name,
      description: meta.description ?? s.description,
    })),

  setShareId: (id) => set({ shareId: id }),

  toProject: () => {
    // Will be wired to import other stores dynamically
    return {
      version: "1.0" as const,
      metadata: {
        name: get().name,
        description: get().description,
        coverImage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      pois: [],
      edges: [],
      days: [],
      shareId: get().shareId,
      exportedAt: new Date().toISOString(),
    };
  },

  fromProject: (project) => {
    set({
      name: project.metadata.name,
      description: project.metadata.description,
      shareId: project.shareId,
    });
  },
}));
