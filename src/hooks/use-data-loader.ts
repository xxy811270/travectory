"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePoiStore, useEdgeStore, useScheduleStore, useUiStore } from "@/stores";
import { poiApi, edgeApi, dayApi } from "@/lib/api-client";

export function useDataLoader() {
  const loadedRef = useRef<boolean>(false);
  const setPois = usePoiStore((s) => s.setPois);
  const setEdges = useEdgeStore((s) => s.setEdges);
  const setDays = useScheduleStore((s) => s.setDays);
  const setSaveStatus = useUiStore((s) => s.setSaveStatus);
  const setLastSavedAt = useUiStore((s) => s.setLastSavedAt);
  const setStatusMessage = useUiStore((s) => s.setStatusMessage);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const load = async () => {
      try {
        setStatusMessage("加载数据中...");
        const [pois, edges, days] = await Promise.all([
          poiApi.list().catch(() => []),
          edgeApi.list().catch(() => []),
          dayApi.list().catch(() => []),
        ]);
        setPois(pois as never[] || []);
        setEdges(edges as never[] || []);
        setDays(days as never[] || []);
        setStatusMessage("就绪");
        setSaveStatus("saved");
      } catch {
        setStatusMessage("数据加载失败");
      }
    };
    load();
  }, []);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        setSaveStatus("saved");
        setLastSavedAt(new Date().toISOString());
        useUiStore.getState().setDirty(false);
      } catch {
        setSaveStatus("unsaved");
      }
    }, 2000);
  }, []);

  useEffect(() => {
    const unsub = useUiStore.subscribe((state, prev) => {
      if (state.dirtyFlag && !prev.dirtyFlag) autoSave();
    });
    return unsub;
  }, [autoSave]);

  return { autoSave };
}
