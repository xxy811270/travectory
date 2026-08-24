"use client";

import { useEffect, useState } from "react";
import { useScheduleStore } from "@/stores";
import { useProjectStore } from "@/stores/project-store";
import { toast } from "sonner";

function hdrs() {
  const u = localStorage.getItem("travectory_user");
  const p = localStorage.getItem("travectory_project");
  const uid = u ? JSON.parse(u).id || "default" : "default";
  const pid = p ? JSON.parse(p).id || uid : uid;
  return { "Content-Type": "application/json", "x-user-id": uid, "x-project-id": pid };
}

function exportFilename(projectName: string, extension: "html" | "png"): string {
  const now = new Date();
  const dateStamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const safeName = projectName
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim() || "路书";
  return `${safeName}_${dateStamp}.${extension}`;
}

export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [canUndoImport,setCanUndoImport]=useState(false);
  const days = useScheduleStore((s) => s.days);
  const currentProject = useProjectStore((s) => s.currentProject);
  useEffect(()=>{if(!currentProject)return;fetch("/api/import/roadbook/undo",{headers:hdrs()}).then(res=>res.json()).then(body=>setCanUndoImport(!!body.canUndo)).catch(()=>undefined);},[currentProject?.id]);

  const handleExportHtml = async () => {
    const res = await fetch("/api/export/html", { headers: hdrs() });
    const blob = await res.blob();
    const a = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = exportFilename(currentProject?.name || "路书", "html");
    a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    setOpen(false);
  };

  const handleExportImage = async () => {
    if (isExportingImage) return;
    setIsExportingImage(true);
    try {
      const res = await fetch("/api/export/image", { headers: hdrs() });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "生成长图失败");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = exportFilename(currentProject?.name || "路书", "png");
      a.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setOpen(false);
      toast.success("路书长图已生成");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "生成长图失败");
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleExportJson = async () => {
    const res = await fetch("/api/export/json", { headers: hdrs() });
    const blob = await res.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "roadbook.json"; a.click();
    setOpen(false);
  };

  const handleExportGpx = async (dayId: string) => {
    const res = await fetch("/api/export/gpx", { method: "POST", headers: hdrs(), body: JSON.stringify({ dayId }) });
    const blob = await res.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `day-${dayId}.gpx`; a.click();
  };

  const handleImportGpx = () => {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".gpx,.kml";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const res = await fetch("/api/import/gpx", { method: "POST", headers: hdrs(), body: JSON.stringify({ xml: await file.text() }) });
      const r = await res.json();
      alert(r.pois ? `导入成功！${r.pois.length}个POI, ${r.edges?.length || 0}条边` : "导入失败: " + (r.error || "未知错误"));
      if (r.pois) window.location.reload();
    };
    input.click(); setOpen(false);
  };

  const handleImportRoadbook = () => {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".roadbook.json,.json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const data = JSON.parse(await file.text());
      if(!data?.metadata?.name||!Array.isArray(data.pois)||!Array.isArray(data.edges)||!Array.isArray(data.days)){toast.error("文件不是有效的路书备份");return;}
      if(!confirm(`将用“${data.metadata.name}”覆盖当前路书。\n${data.days.length} 天 · ${data.pois.length} 个 POI · ${data.edges.length} 条路线\n\n覆盖前会自动保存恢复快照，是否继续？`))return;
      const res = await fetch("/api/import/roadbook", { method: "POST", headers: hdrs(), body: JSON.stringify(data) });
      const r = await res.json();
      alert(r.success ? `覆盖成功！${r.poiCount}个POI, ${r.edgeCount}条边, ${r.dayCount}天` : "导入失败: " + (r.error || "未知错误"));
      if(r.success)setCanUndoImport(true);
      if (r.success) window.location.reload();
    };
    input.click(); setOpen(false);
  };

  const handleUndoImport=async()=>{if(!confirm("恢复到上一次 JSON 覆盖前的完整路书？"))return;const res=await fetch("/api/import/roadbook/undo",{method:"POST",headers:hdrs()});const body=await res.json();if(!res.ok){toast.error(body.error||"撤回失败");return;}toast.success("已恢复覆盖前版本");window.location.reload();};

  return (
    <div className="relative">
      <button className="px-3 py-1 text-xs border border-border rounded hover:bg-gray-50" onClick={() => setOpen(!open)}>导出/导入</button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-surface border border-border rounded shadow-lg z-50 py-1">
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 font-medium" onClick={handleExportHtml}>📄 导出 HTML 路书</button>
          <button
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 font-medium disabled:opacity-50"
            onClick={handleExportImage}
            disabled={isExportingImage}
          >
            {isExportingImage ? "生成长图中..." : "🖼 导出长图 PNG"}
          </button>
          <div className="border-t border-border" />
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50" onClick={handleExportJson}>导出 .roadbook JSON</button>
          <div className="border-t border-border">
            <div className="px-3 py-1 text-[10px] text-text-muted">导出 GPX (按天)</div>
            {days.map((day) => (
              <button key={day.id} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50" onClick={() => handleExportGpx(day.id)}>▸ {day.label || `Day ${day.dayNumber}`}</button>
            ))}
          </div>
          <div className="border-t border-border pt-1">
            <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50" onClick={handleImportRoadbook}>用 JSON 覆盖当前路书</button>
            {canUndoImport&&<button className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-blue-50" onClick={handleUndoImport}>撤回上一次 JSON 覆盖</button>}
            <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50" onClick={handleImportGpx}>导入 GPX/KML</button>
          </div>
          <div className="border-t border-border">
            <button className="w-full text-left px-3 py-1.5 text-xs text-text-muted hover:bg-gray-50" onClick={() => setOpen(false)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}
