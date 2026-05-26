// ========== UI Store ==========
import { create } from "zustand";

interface UIStore {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  activeDialog: string | null;
  dirtyFlag: boolean;
  statusMessage: string;
  saveStatus: "saved" | "unsaved" | "saving";
  lastSavedAt: string | null;
  showDayOverlay: boolean;
  showDistanceLabels: boolean;

  // Actions
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelWidth: (w: number) => void;
  setRightPanelWidth: (w: number) => void;
  setActiveDialog: (id: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setStatusMessage: (msg: string) => void;
  setSaveStatus: (status: "saved" | "unsaved" | "saving") => void;
  setLastSavedAt: (ts: string | null) => void;
  setShowDayOverlay: (show: boolean) => void;
  setShowDistanceLabels: (show: boolean) => void;
}

export const useUiStore = create<UIStore>((set) => ({
  leftPanelOpen: true,
  rightPanelOpen: true,
  leftPanelWidth: 280,
  rightPanelWidth: 340,
  activeDialog: null,
  dirtyFlag: false,
  statusMessage: "就绪",
  saveStatus: "saved",
  lastSavedAt: null,
  showDayOverlay: false,
  showDistanceLabels: true,

  toggleLeftPanel: () =>
    set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () =>
    set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setLeftPanelWidth: (w) => set({ leftPanelWidth: w }),
  setRightPanelWidth: (w) => set({ rightPanelWidth: w }),
  setActiveDialog: (id) => set({ activeDialog: id }),
  setDirty: (dirty) => set({ dirtyFlag: dirty }),
  setStatusMessage: (msg) => set({ statusMessage: msg }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setLastSavedAt: (ts) => set({ lastSavedAt: ts }),
  setShowDayOverlay: (show) => set({ showDayOverlay: show }),
  setShowDistanceLabels: (show) => set({ showDistanceLabels: show }),
}));
