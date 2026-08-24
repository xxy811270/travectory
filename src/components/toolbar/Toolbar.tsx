"use client";

import { useRef, useState } from "react";
import { useUiStore } from "@/stores";
import { usePoiStore } from "@/stores/poi-store";
import { useScheduleStore } from "@/stores/schedule-store";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectStore } from "@/stores/project-store";
import { ExportMenu } from "./ExportMenu";
import { ShareButton } from "./ShareButton";
import { dayApi } from "@/lib/api-client";
import { toast } from "sonner";

export function Toolbar() {
  const { showDayOverlay, setShowDayOverlay, showDistanceLabels, setShowDistanceLabels } = useUiStore();
  const pois = usePoiStore((s) => s.pois);
  const days = useScheduleStore((s) => s.days);
  const setDays = useScheduleStore((s) => s.setDays);
  const { user, logout } = useAuthStore();
  const { currentProject, setCurrentProject } = useProjectStore();
  const [isReversing, setIsReversing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const cancelNameEditRef = useRef(false);

  const startEditingName = () => {
    if (!currentProject) return;
    cancelNameEditRef.current = false;
    setNameDraft(currentProject.name);
    setIsEditingName(true);
  };

  const saveProjectName = async () => {
    if (cancelNameEditRef.current) {
      cancelNameEditRef.current = false;
      return;
    }
    if (!currentProject || isSavingName) return;
    const name = nameDraft.trim();
    if (!name) {
      toast.error("路书名称不能为空");
      return;
    }
    if (name === currentProject.name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-id": user?.id || "default" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "保存路书名称失败");
      setCurrentProject({ ...currentProject, name, updatedAt: new Date().toISOString() });
      setIsEditingName(false);
      toast.success("路书名称已更新");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存路书名称失败");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleReverseItinerary = async () => {
    const itemCount = days.reduce((count, day) => count + day.items.length, 0);
    if (itemCount < 2 || isReversing) return;
    if (!confirm("确定倒转全部行程吗？所有天的先后顺序及每天的 POI 顺序都会反转。再次倒转可恢复原顺序。")) return;

    setIsReversing(true);
    try {
      const reversedDays = await dayApi.reverse();
      setDays(reversedDays);
      useScheduleStore.getState().selectItem(null);
      useUiStore.getState().setDirty(true);
      toast.success("全部行程已倒转");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "倒转失败，原行程未改变");
    } finally {
      setIsReversing(false);
    }
  };

  return (
    <header className="h-12 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0 z-30 relative">
      <button
        className="text-xs text-text-muted hover:text-primary px-1 py-0.5 rounded"
        onClick={() => setCurrentProject(null)}
        title="返回主页"
      >
        ← 主页
      </button>
      <div className="w-px h-4 bg-border" />
      {isEditingName ? (
        <input
          className="w-48 px-2 py-1 text-sm font-bold border border-primary rounded focus:outline-none"
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              cancelNameEditRef.current = true;
              setIsEditingName(false);
            }
          }}
          onBlur={saveProjectName}
          disabled={isSavingName}
          maxLength={100}
          autoFocus
          aria-label="路书名称"
        />
      ) : (
        <button
          className="font-bold text-sm truncate max-w-[200px] hover:text-primary text-left"
          onClick={startEditingName}
          title="点击编辑路书名称"
        >
          {currentProject?.name || "Travectory"}
        </button>
      )}

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
        <button
          className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleReverseItinerary}
          disabled={days.reduce((count, day) => count + day.items.length, 0) < 2 || isReversing}
          title="倒转全部天数及每天的 POI 顺序"
        >
          {isReversing ? "倒转中..." : "⇄ 一键倒转"}
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
