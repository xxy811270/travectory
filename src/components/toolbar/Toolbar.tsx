"use client";

import { useUiStore } from "@/stores";
import { usePoiStore } from "@/stores/poi-store";
import { useScheduleStore } from "@/stores/schedule-store";
import { useAuthStore } from "@/stores/auth-store";
import { ExportMenu } from "./ExportMenu";
import { ShareButton } from "./ShareButton";

export function Toolbar() {
  const { showDayOverlay, setShowDayOverlay, showDistanceLabels, setShowDistanceLabels } = useUiStore();
  const pois = usePoiStore((s) => s.pois);
  const days = useScheduleStore((s) => s.days);
  const { user, logout } = useAuthStore();

  return (
    <header className="h-12 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0 z-30 relative">
      <h1 className="font-bold text-base">Travectory</h1>
      <span className="text-text-muted text-xs hidden sm:inline">路书规划</span>

      <div className="w-px h-5 bg-border mx-1" />

      <div className="flex items-center gap-1">
        <button
          className={`px-2 py-1 text-xs rounded ${showDayOverlay ? "bg-primary text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          onClick={() => setShowDayOverlay(!showDayOverlay)}
          title="显示日程分段"
        >
          日程分段
        </button>
        <button
          className={`px-2 py-1 text-xs rounded ${showDistanceLabels ? "bg-primary text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          onClick={() => setShowDistanceLabels(!showDistanceLabels)}
          title="显示距离标签"
        >
          距离标签
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">
          {pois.length} 个POI · {days.length} 天
        </span>
        <ExportMenu />
        <ShareButton />
        <div className="w-px h-4 bg-border" />
        <span className="text-xs text-text-muted">{user?.username}</span>
        <button
          className="text-xs text-text-muted hover:text-danger"
          onClick={() => { logout(); window.location.reload(); }}
        >
          退出
        </button>
      </div>
    </header>
  );
}
