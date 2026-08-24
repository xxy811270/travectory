"use client";

import { create } from "zustand";

interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  poiCount: number;
  edgeCount: number;
  dayCount: number;
  updatedAt: string;
}

interface ProjectStore {
  currentProject: ProjectMeta | null;
  setCurrentProject: (p: ProjectMeta | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  currentProject: null,
  setCurrentProject: (p) => {
    if (p) localStorage.setItem("travectory_project", JSON.stringify({ id: p.id, name: p.name }));
    else localStorage.removeItem("travectory_project");
    set({ currentProject: p });
  },
}));

export function getStoredProjectId(): string {
  if (typeof window === "undefined") return "";
  try {
    const v = localStorage.getItem("travectory_project");
    return v ? JSON.parse(v).id || "" : "";
  } catch { return ""; }
}
