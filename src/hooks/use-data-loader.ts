"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePoiStore, useEdgeStore, useScheduleStore, useProjectStore, useUiStore } from "@/stores";
import { poiApi, edgeApi, dayApi, projectApi } from "@/lib/api-client";

export function useDataLoader() {
  const loadedRef = useRef<boolean>(false);
  const setPois = usePoiStore((s) => s.setPois);
  const setEdges = useEdgeStore((s) => s.setEdges);
  const setDays = useScheduleStore((s) => s.setDays);
  const setMetadata = useProjectStore((s) => s.setMetadata);
  const setSaveStatus = useUiStore((s) => s.setSaveStatus);
  const setLastSavedAt = useUiStore((s) => s.setLastSavedAt);
  const setStatusMessage = useUiStore((s) => s.setStatusMessage);

  // Initial load
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const load = async () => {
      try {
        setStatusMessage("加载数据中...");
        const [pois, edges, days, meta] = await Promise.all([
          poiApi.list().catch(() => []),
          edgeApi.list().catch(() => []),
          dayApi.list().catch(() => []),
          projectApi.get().catch(() => null),
        ]);
        setPois(pois as never[] || []);
        setEdges(edges as never[] || []);
        setDays(days as never[] || []);
        if (meta) setMetadata(meta as never);
        setStatusMessage("就绪");
        setSaveStatus("saved");
      } catch {
        setStatusMessage("数据加载失败");
      }
    };
    load();
  }, []);

  // Auto-save (debounced)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await projectApi.update({
          name: useProjectStore.getState().name,
          description: useProjectStore.getState().description,
        });
        setSaveStatus("saved");
        setLastSavedAt(new Date().toISOString());
        useUiStore.getState().setDirty(false);
      } catch {
        setSaveStatus("unsaved");
      }
    }, 2000);
  }, []);

  // Watch for dirty flag changes and trigger auto-save
  useEffect(() => {
    const unsub = useUiStore.subscribe((state, prev) => {
      if (state.dirtyFlag && !prev.dirtyFlag) {
        autoSave();
      }
    });
    return unsub;
  }, [autoSave]);

  return { autoSave };
}
