"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, CircleEllipsis, FileUp, Plus,
  Download, Hotel, Map as MapIcon, MapPin, Navigation, RefreshCw,
  Route, Utensils, Zap,
} from "lucide-react";
import { loadMobileData, loadProjects } from "../lib/local-api";
import { localProjectFiles } from "../lib/local-api";
import { parseRoadbookFile, summarizeRoadbook, type RoadbookFile, type RoadbookSummary } from "../lib/roadbook-format";
import { consumeNativeRoadbook, isNativeApp } from "../lib/native-roadbook";
import type { Day, Edge, Poi, Project, ProjectListItem } from "../types";
import { MobileMap } from "./MobileMap";
import { MobilePoiManager } from "./MobilePoiManager";
import { MobileEdgeManager } from "./MobileEdgeManager";
import { MobileScheduleManager } from "./MobileScheduleManager";
import { MobileTools } from "./MobileTools";

type Tab = "schedule" | "map" | "pois" | "edges" | "more";

const tagIcon = {
  normal: MapPin,
  hotel: Hotel,
  restaurant: Utensils,
  gas_station: Zap,
};

export function MobileApp() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectListItem | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [tab, setTab] = useState<Tab>("schedule");
  const [project, setProject] = useState<Project>({ name: "Travectory" });
  const [days, setDays] = useState<Day[]>([]);
  const [pois, setPois] = useState<Poi[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [pendingPoiCoordinates, setPendingPoiCoordinates] = useState<{ lng: number; lat: number; name?: string; address?: string; phone?: string; amapPoiId?: string } | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ file: RoadbookFile; summary: RoadbookSummary; filename: string } | null>(null);

  const openProject = async (nextProject: ProjectListItem, quiet = false) => {
    setSelectedProject(nextProject);
    setShowProjectPicker(false);
    if (!quiet) setLoading(true);
    setError("");
    try {
      const data = await loadMobileData(nextProject.userId, nextProject.id);
      setProject(data.project);
      setDays(data.days);
      setPois(data.pois);
      setEdges(data.edges);
      setSelectedDayId((current) => current || data.days[0]?.id || null);
    } catch {
      setError("暂时无法读取手机本地路书");
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const refreshProjects = async () => {
    setLoading(true);
    setError("");
    try {
      setProjects(await loadProjects());
    } catch {
      setError("暂时无法读取手机本地路书");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/sw.js`).catch(() => undefined);
    void refreshProjects();
  }, []);

  const createBlank = async () => {
    const name = prompt("请输入新路书名称", "未命名路书")?.trim();
    if (!name) return;
    setLoading(true);
    try { const created = await localProjectFiles.createEmpty(name); await refreshProjects(); await openProject(created); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "新建路书失败"); }
    finally { setLoading(false); }
  };
  const previewImportText = (text: string, filename: string) => {
    try { const parsed = parseRoadbookFile(JSON.parse(text)); setPendingImport({ file: parsed, summary: summarizeRoadbook(parsed), filename }); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "路书文件无法读取"); }
  };
  const chooseImport = async (file: File) => {
    try { previewImportText(await file.text(), file.name); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "路书文件无法读取"); }
    finally { if (importRef.current) importRef.current.value = ""; }
  };
  useEffect(() => {
    if (!isNativeApp()) return;
    let active = true;
    const poll = async () => { try { const incoming = await consumeNativeRoadbook(); if (active && incoming) previewImportText(incoming.text, incoming.filename); } catch { /* native bridge not ready yet */ } };
    void poll(); const timer = window.setInterval(() => void poll(), 1200);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const confirmImport = async () => {
    if (!pendingImport) return;
    setLoading(true);
    try { const created = await localProjectFiles.importNew(pendingImport.file); setPendingImport(null); await refreshProjects(); await openProject(created); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "导入失败"); }
    finally { setLoading(false); }
  };

  const selectedDay = useMemo(
    () => days.find((day) => day.id === selectedDayId) || days[0],
    [days, selectedDayId]
  );
  const poiById = useMemo(() => new Map(pois.map((poi) => [poi.id, poi])), [pois]);

  return (
    <main className="mobile-frame">
      <header className="topbar">
        <div>
          <div className="eyebrow">TRAVECTORY · 移动路书</div>
          <button className="project-select" onClick={() => setShowProjectPicker((value) => !value)}>
            <span>{selectedProject?.name || "请选择一本路书"}</span>
            <ChevronDown size={18} />
          </button>
        </div>
        <button className="round-button" onClick={() => selectedProject ? void openProject(selectedProject) : void refreshProjects()} aria-label="刷新">
          <RefreshCw size={18} className={loading ? "spinning" : ""} />
        </button>
      </header>

      <div className="content-scroll">
        {(showProjectPicker || !selectedProject) && !error && (
          <ProjectPicker projects={projects} selectedId={selectedProject?.id} loading={loading} onSelect={(item) => void openProject(item)} onCreate={() => void createBlank()} onImport={() => importRef.current?.click()} />
        )}
        {error && <ConnectionCard onRetry={() => selectedProject ? openProject(selectedProject) : refreshProjects()} />}
        {!error && selectedProject && !showProjectPicker && tab === "schedule" && (
          loading ? <LoadingCards /> : <MobileScheduleManager days={days} pois={pois} edges={edges} userId={selectedProject.userId} projectId={selectedProject.id} onChanged={() => openProject(selectedProject, true)} />
        )}
        {!error && selectedProject && !showProjectPicker && tab === "map" && <MobileMap days={days} pois={pois} edges={edges} userId={selectedProject.userId} projectId={selectedProject.id} onAddPoi={(poi) => { setPendingPoiCoordinates(poi); setTab("pois"); }} onDataChanged={() => openProject(selectedProject, true)} />}
        {!error && selectedProject && !showProjectPicker && tab === "pois" && (
          <MobilePoiManager
            pois={pois}
            userId={selectedProject.userId}
            projectId={selectedProject.id}
            onChanged={() => openProject(selectedProject, true)}
            initialPoi={pendingPoiCoordinates}
            onCoordinatesConsumed={() => setPendingPoiCoordinates(null)}
          />
        )}
        {!error && selectedProject && !showProjectPicker && tab === "edges" && (
          <MobileEdgeManager edges={edges} pois={pois} userId={selectedProject.userId} projectId={selectedProject.id} onChanged={() => openProject(selectedProject, true)} />
        )}
        {!error && selectedProject && !showProjectPicker && tab === "more" && <MobileTools project={selectedProject} days={days} pois={pois} edges={edges} onChanged={() => openProject(selectedProject, true)} onRenamed={(name) => { setSelectedProject((current) => current ? { ...current, name } : current); setProjects((current) => current.map((item) => item.id === selectedProject.id ? { ...item, name } : item)); setProject((current) => ({ ...current, name })); }} />}
      </div>

      <input ref={importRef} hidden type="file" accept=".json,.roadbook.json,application/json" onChange={(event) => event.target.files?.[0] && void chooseImport(event.target.files[0])} />
      {pendingImport && <ImportPreview pending={pendingImport} onCancel={() => setPendingImport(null)} onConfirm={() => void confirmImport()} loading={loading} />}

      <nav className="bottom-nav" aria-label="主要功能">
        <NavButton active={tab === "schedule"} icon={CalendarDays} label="行程" onClick={() => setTab("schedule")} />
        <NavButton active={tab === "map"} icon={MapIcon} label="地图" onClick={() => setTab("map")} />
        <NavButton active={tab === "pois"} icon={MapPin} label="地点" onClick={() => setTab("pois")} />
        <NavButton active={tab === "edges"} icon={Route} label="路线" onClick={() => setTab("edges")} />
        <NavButton active={tab === "more"} icon={CircleEllipsis} label="更多" onClick={() => setTab("more")} />
      </nav>
    </main>
  );
}

function ProjectPicker({ projects, selectedId, loading, onSelect, onCreate, onImport }: {
  projects: ProjectListItem[];
  selectedId?: string;
  loading: boolean;
  onSelect: (project: ProjectListItem) => void;
  onCreate: () => void;
  onImport: () => void;
}) {
  return (
    <section className="screen project-screen">
      <div className="picker-heading"><div><small>TRAVECTORY</small><h2>选择一本路书</h2><p>数据仅保存在当前设备。</p></div></div>
      <div className="project-create-actions"><button onClick={onCreate}><Plus size={18}/><span><b>新建空白路书</b><small>从零开始编辑</small></span></button><button onClick={onImport}><FileUp size={18}/><span><b>从文件导入</b><small>.roadbook.json</small></span></button></div>
      {loading ? <LoadingCards /> : <div className="project-list">
        {projects.map((item) => (
          <button key={item.id} className={selectedId === item.id ? "selected" : ""} onClick={() => onSelect(item)}>
            <span className="book-icon"><BookOpen size={23} /></span>
            <span className="project-copy"><b>{item.name}</b><small>{item.dayCount} 天 · {item.poiCount} 个地点 · {item.edgeCount} 条路线</small><em>{item.description || `更新于 ${new Date(item.updatedAt).toLocaleDateString("zh-CN")}`}</em></span>
            {selectedId === item.id ? <Check size={20} /> : <ChevronRight size={20} />}
          </button>
        ))}
        {projects.length === 0 && <div className="empty-card"><BookOpen size={36} /><b>手机中还没有路书</b><span>可新建空白路书或导入桌面端备份</span></div>}
      </div>}
    </section>
  );
}

function ImportPreview({ pending, onCancel, onConfirm, loading }: { pending: { summary: RoadbookSummary; filename: string }; onCancel: () => void; onConfirm: () => void; loading: boolean }) {
  const summary = pending.summary;
  return <div className="mobile-sheet-backdrop"><div className="mobile-sheet import-preview-sheet"><div className="sheet-handle"/><div className="sheet-title"><div><b>确认导入为新路书</b><small>{pending.filename}</small></div></div><div className="import-preview-body"><h3>{summary.name}</h3>{summary.description&&<p>{summary.description}</p>}<div><span><b>{summary.dayCount}</b><small>日程天数</small></span><span><b>{summary.poiCount}</b><small>POI</small></span><span><b>{summary.edgeCount}</b><small>路线</small></span><span><b>{summary.scheduleCount}</b><small>日程项目</small></span></div><small>文件已通过坐标、ID和关联完整性校验；导入后会创建独立副本。</small></div><div className="sheet-actions"><button className="delete" onClick={onCancel} disabled={loading}>取消</button><button className="save" onClick={onConfirm} disabled={loading}>{loading?"导入中...":"确认导入"}</button></div></div></div>;
}

function ScheduleScreen({ days, pois, selectedDay, poiById, loading, onSelectDay }: {
  days: Day[];
  pois: Poi[];
  selectedDay?: Day;
  poiById: Map<string, Poi>;
  loading: boolean;
  onSelectDay: (id: string) => void;
}) {
  if (loading) return <LoadingCards />;
  return (
    <section className="screen">
      <div className="summary-card">
        <div><strong>{days.length}</strong><span>行程天数</span></div>
        <i />
        <div><strong>{pois.length}</strong><span>沿途地点</span></div>
        <i />
        <div><strong>{days.reduce((sum, day) => sum + day.items.length, 0)}</strong><span>日程安排</span></div>
      </div>

      <div className="section-heading">
        <div><span>你的行程</span><small>共 {days.length} 天，点击选择任意一天</small></div>
        <Route size={22} />
      </div>

      <div className="day-strip">
        {days.map((day) => (
          <button key={day.id} className={`day-pill ${selectedDay?.id === day.id ? "active" : ""}`} onClick={() => onSelectDay(day.id)}>
            <b>DAY {day.dayNumber}</b>
            <span>{day.date || `${day.items.length} 个地点`}</span>
          </button>
        ))}
      </div>

      {!selectedDay ? (
        <div className="empty-card"><CalendarDays size={36} /><b>还没有日程</b><span>请先在桌面版创建第一天行程</span></div>
      ) : (
        <div className="itinerary-card">
          <div className="card-title">
            <div><small>DAY {selectedDay.dayNumber}</small><h2>{normalizedDayLabel(selectedDay)}</h2></div>
            <span>{selectedDay.items.length} 站</span>
          </div>
          <div className="timeline">
            {[...selectedDay.items].sort((a, b) => a.order - b.order).map((item, index, items) => {
              const poi = poiById.get(item.poiId);
              const Icon = poi ? tagIcon[poi.tag] : MapPin;
              return (
                <div className="timeline-row" key={item.id}>
                  <div className="timeline-mark"><Icon size={17} /><i className={index === items.length - 1 ? "last" : ""} /></div>
                  <div className="place-info"><b>{poi?.name || "未命名地点"}</b><span>{poi?.address || tagName(poi?.tag)}</span></div>
                  <ChevronRight size={18} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function PoisScreen({ pois }: { pois: Poi[] }) {
  return (
    <section className="screen">
      <div className="section-heading"><div><span>地点库</span><small>当前路书中的全部地点</small></div><MapPin size={22} /></div>
      <div className="poi-list">
        {pois.map((poi) => {
          const Icon = tagIcon[poi.tag];
          return <div className="poi-row" key={poi.id}><div className={`poi-icon ${poi.tag}`}><Icon size={19} /></div><div><b>{poi.name}</b><span>{poi.address || tagName(poi.tag)}</span></div><ChevronRight size={18} /></div>;
        })}
        {pois.length === 0 && <div className="empty-card"><MapPin size={36} /><b>还没有地点</b><span>地点编辑将在后续阶段接入</span></div>}
      </div>
    </section>
  );
}

function MoreScreen({ days, pois }: { days: number; pois: number }) {
  return (
    <section className="screen">
      <div className="section-heading"><div><span>路书工具</span><small>{days} 天 · {pois} 个地点</small></div><CircleEllipsis size={22} /></div>
      <div className="menu-card">
        <button><span className="menu-icon"><Download size={20} /></span><div><b>导出与分享</b><small>PNG 长图、HTML、GPX</small></div><ChevronRight size={19} /></button>
        <button><span className="menu-icon"><Navigation size={20} /></span><div><b>定位与导航</b><small>将在地图阶段启用</small></div><ChevronRight size={19} /></button>
      </div>
      <div className="version-note">Travectory Mobile · v1.1.2</div>
    </section>
  );
}

function ComingScreen({ icon: Icon, title, text }: { icon: typeof MapIcon; title: string; text: string }) {
  return <section className="screen center-screen"><div className="coming-icon"><Icon size={34} /></div><h2>{title}</h2><p>{text}</p><span>将在下一阶段完成</span></section>;
}

function ConnectionCard({ onRetry }: { onRetry: () => Promise<void> }) {
  return <section className="screen center-screen"><div className="coming-icon warning"><Zap size={32} /></div><h2>本地路书读取失败</h2><p>路书仅保存在当前设备，可重试读取或重新导入备份。</p><button className="primary-button" onClick={() => void onRetry()}>重新读取</button></section>;
}

function NavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof MapIcon; label: string; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick}><Icon size={21} strokeWidth={active ? 2.5 : 2} /><span>{label}</span></button>;
}

function LoadingCards() {
  return <section className="screen"><div className="skeleton tall" /><div className="skeleton-title" /><div className="skeleton row" /><div className="skeleton card" /></section>;
}

function normalizedDayLabel(day: Day): string {
  const label = day.label?.trim() || "";
  return !label || /^day\s*\d+$/i.test(label) || /^第\s*(?:\d+|[零〇一二两三四五六七八九十百千万]+)\s*天$/.test(label)
    ? `第 ${day.dayNumber} 天`
    : label;
}

function tagName(tag?: Poi["tag"]): string {
  return tag === "hotel" ? "住宿" : tag === "restaurant" ? "餐饮" : tag === "gas_station" ? "加油站" : "普通地点";
}
