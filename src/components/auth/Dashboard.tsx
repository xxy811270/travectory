"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectStore, getStoredProjectId } from "@/stores/project-store";
import type { Project } from "@/lib/db/auth";

function getHeaders() {
  const uid = localStorage.getItem("travectory_user");
  const userId = uid ? JSON.parse(uid).id || "default" : "default";
  return { "Content-Type": "application/json", "x-user-id": userId };
}

export function Dashboard() {
  const { user, logout } = useAuthStore();
  const { setCurrentProject } = useProjectStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects", { headers: getHeaders() });
      setProjects(await res.json());
    } catch { /* ok */ }
    setLoading(false);
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST", headers: getHeaders(),
      body: JSON.stringify({ name: newName.trim() }),
    });
    const project = await res.json();
    if (res.ok) {
      setShowCreate(false);
      setNewName("");
      loadProjects();
    }
  };

  const handleImportNew = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!data?.metadata?.name || !Array.isArray(data.pois) || !Array.isArray(data.edges) || !Array.isArray(data.days)) throw new Error("文件不是有效的路书备份");
      const items = data.days.reduce((sum: number, day: { items?: unknown[] }) => sum + (Array.isArray(day.items) ? day.items.length : 0), 0);
      if (!confirm(`将从“${data.metadata.name}”新建一本独立路书。\n${data.days.length} 天 · ${data.pois.length} 个 POI · ${data.edges.length} 条路线 · ${items} 个日程项目\n\n是否继续？`)) return;
      const res = await fetch("/api/projects/import", { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "导入失败");
      await loadProjects();
    } catch (error) { alert(error instanceof Error ? error.message : "导入失败"); }
    finally { if (importRef.current) importRef.current.value = ""; }
  };

  const handleSelect = (project: Project) => {
    setCurrentProject({ id: project.id, name: project.name, description: project.description, poiCount: project.poiCount, edgeCount: project.edgeCount, dayCount: project.dayCount, updatedAt: project.updatedAt });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这个路书？数据不可恢复。")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE", headers: getHeaders() });
    loadProjects();
  };

  const handleRename = async (project: Project) => {
    const value = prompt("输入新的路书名称：", project.name);
    const name = value?.trim();
    if (!name || name === project.name) return;
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PUT", headers: getHeaders(), body: JSON.stringify({ name }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      alert(body?.error || "修改路书名称失败");
      return;
    }
    loadProjects();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Travectory</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">{user?.username}</span>
          <button className="text-xs text-text-muted hover:text-danger" onClick={() => { logout(); window.location.reload(); }}>退出</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">我的路书</h2>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm border border-primary text-primary bg-white rounded-lg hover:bg-blue-50" onClick={() => importRef.current?.click()}>从 JSON 新建</button>
            <button className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark" onClick={() => setShowCreate(true)}>+ 新建路书</button>
            <input ref={importRef} hidden type="file" accept=".json,.roadbook.json,application/json" onChange={(event)=>event.target.files?.[0]&&void handleImportNew(event.target.files[0])}/>
          </div>
        </div>

        {showCreate && (
          <div className="mb-6 bg-white border border-border rounded-lg p-4 flex gap-3">
            <input
              className="flex-1 px-3 py-2 text-sm border border-border rounded focus:outline-none focus:border-primary"
              placeholder="路书名称..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <button className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-dark" onClick={handleCreate}>创建</button>
            <button className="px-3 py-2 text-sm border rounded hover:bg-gray-50" onClick={() => setShowCreate(false)}>取消</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-text-muted">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-border">
            <p className="text-text-muted mb-3">还没有路书</p>
            <button className="px-4 py-2 text-sm bg-primary text-white rounded-lg" onClick={() => setShowCreate(true)}>
              创建第一个路书
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleSelect(p)}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-base mb-1">{p.name}</h3>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="text-xs text-text-muted hover:text-primary"
                      onClick={(e) => { e.stopPropagation(); handleRename(p); }}
                    >
                      重命名
                    </button>
                    <button
                      className="text-xs text-text-muted hover:text-danger"
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                    >
                      删除
                    </button>
                  </div>
                </div>
                {p.description && <p className="text-xs text-text-muted mb-3">{p.description}</p>}
                <div className="flex gap-4 text-xs text-text-muted mt-3 pt-3 border-t border-border">
                  <span>📍 {p.poiCount} POI</span>
                  <span>🛣 {p.edgeCount} 路线</span>
                  <span>📅 {p.dayCount} 天</span>
                </div>
                <div className="text-[10px] text-text-muted mt-2">
                  更新于 {new Date(p.updatedAt).toLocaleDateString("zh-CN")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
