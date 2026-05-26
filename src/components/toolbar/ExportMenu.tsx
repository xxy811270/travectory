"use client";

import { useState } from "react";
import { useScheduleStore } from "@/stores";

export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const days = useScheduleStore((s) => s.days);

  const handleExportHtml = async () => {
    const uid = localStorage.getItem("travectory_user")
      ? JSON.parse(localStorage.getItem("travectory_user")!).id || "default"
      : "default";
    const res = await fetch("/api/export/html", {
      headers: { "x-user-id": uid },
    });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "roadbook.html";
    a.click();
    setOpen(false);
  };

  const handleExportJson = async () => {
    const uid = localStorage.getItem("travectory_user")
      ? JSON.parse(localStorage.getItem("travectory_user")!).id || "default"
      : "default";
    const res = await fetch("/api/export/json", {
      headers: { "x-user-id": uid },
    });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "roadbook.json";
    a.click();
    setOpen(false);
  };

  const handleExportGpx = async (dayId: string) => {
    const res = await fetch("/api/export/gpx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayId }),
    });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `day-${dayId}.gpx`;
    a.click();
  };

  const handleImportGpx = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".gpx,.kml";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const res = await fetch("/api/import/gpx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml: text }),
      });
      const result = await res.json();
      if (result.pois) {
        alert(`导入成功！${result.pois.length}个POI, ${result.edges?.length || 0}条边`);
        window.location.reload();
      } else {
        alert("导入失败: " + (result.error || "未知错误"));
      }
    };
    input.click();
    setOpen(false);
  };

  const handleImportRoadbook = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".roadbook.json,.json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/import/roadbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        alert(`导入成功！${result.poiCount}个POI, ${result.edgeCount}条边, ${result.dayCount}天`);
        window.location.reload();
      } else {
        alert("导入失败: " + (result.error || "未知错误"));
      }
    };
    input.click();
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        className="px-3 py-1 text-xs border border-border rounded hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        导出/导入
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-surface border border-border rounded shadow-lg z-50 py-1">
          <button
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 font-medium"
            onClick={handleExportHtml}
          >
            📄 导出 HTML 路书
          </button>
          <div className="border-t border-border" />
          <button
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
            onClick={handleExportJson}
          >
            导出 .roadbook JSON
          </button>
          <div className="border-t border-border">
            <div className="px-3 py-1 text-[10px] text-text-muted">导出 GPX (按天)</div>
            {days.map((day) => (
              <button
                key={day.id}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
                onClick={() => handleExportGpx(day.id)}
              >
                ▸ {day.label || `Day ${day.dayNumber}`}
              </button>
            ))}
          </div>
          <div className="border-t border-border pt-1">
            <button
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
              onClick={handleImportRoadbook}
            >
              导入 .roadbook JSON
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
              onClick={handleImportGpx}
            >
              导入 GPX/KML
            </button>
          </div>
          <div className="border-t border-border">
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-text-muted hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
