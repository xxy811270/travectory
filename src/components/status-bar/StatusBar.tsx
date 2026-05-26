"use client";

import { useUiStore, usePoiStore, useEdgeStore, useScheduleStore } from "@/stores";

export function StatusBar() {
  const { statusMessage, saveStatus, lastSavedAt } = useUiStore();
  const poiCount = usePoiStore((s) => s.pois.length);
  const edgeCount = useEdgeStore((s) => s.edges.length);
  const dayCount = useScheduleStore((s) => s.days.length);

  const statusColor = {
    saved: "text-success",
    unsaved: "text-accent",
    saving: "text-text-muted",
  };

  return (
    <footer className="h-7 border-t border-border bg-surface flex items-center px-4 text-xs text-text-muted shrink-0 gap-3">
      <span className={statusColor[saveStatus]}>
        {saveStatus === "saved" ? "已保存" : saveStatus === "unsaved" ? "未保存" : "保存中..."}
      </span>
      <span>{statusMessage}</span>
      <span className="flex-1" />
      <span>POI: {poiCount}</span>
      <span>边: {edgeCount}</span>
      <span>天: {dayCount}</span>
      {lastSavedAt && <span>上次保存: {new Date(lastSavedAt).toLocaleTimeString("zh-CN")}</span>}
    </footer>
  );
}
