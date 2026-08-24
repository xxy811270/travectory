"use client";

import { useEffect, useMemo, useState } from "react";
import { Crosshair, Filter, Hotel, MapPin, Plus, Search, Trash2, Utensils, X, Zap } from "lucide-react";
import { mobilePoiApi } from "../lib/local-api";
import { geocodeWithAmap, searchAmapPois } from "../lib/amap-browser";
import type { AmapPoiResult, Poi } from "../types";

type PoiTag = Poi["tag"];
type Draft = { id?: string; name: string; lng: string; lat: string; address: string; tag: PoiTag; phone: string; notes: string; amapPoiId?: string };
const emptyDraft = (): Draft => ({ name: "", lng: "", lat: "", address: "", tag: "normal", phone: "", notes: "" });
const tagLabels: Record<PoiTag, string> = { normal: "普通地点", hotel: "住宿", restaurant: "餐饮", gas_station: "加油站" };
const tagIcons = { normal: MapPin, hotel: Hotel, restaurant: Utensils, gas_station: Zap };

export function MobilePoiManager({ pois, userId, projectId, onChanged, initialPoi, onCoordinatesConsumed }: {
  pois: Poi[];
  userId: string;
  projectId: string;
  onChanged: () => Promise<void>;
  initialPoi?: { lng: number; lat: number; name?: string; address?: string; phone?: string; amapPoiId?: string } | null;
  onCoordinatesConsumed?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<PoiTag | "all">("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showOnlineSearch, setShowOnlineSearch] = useState(false);
  useEffect(() => {
    if (!initialPoi) return;
    setDraft({ ...emptyDraft(), name: initialPoi.name || "", address: initialPoi.address || "", phone: initialPoi.phone || "", amapPoiId: initialPoi.amapPoiId, lng: String(initialPoi.lng), lat: String(initialPoi.lat) });
    onCoordinatesConsumed?.();
  }, [initialPoi, onCoordinatesConsumed]);
  const filtered = useMemo(() => pois.filter((poi) =>
    (tag === "all" || poi.tag === tag) &&
    (!query.trim() || `${poi.name} ${poi.address || ""}`.toLowerCase().includes(query.trim().toLowerCase()))
  ), [pois, query, tag]);

  const editPoi = (poi: Poi) => setDraft({
    id: poi.id, name: poi.name, lng: String(poi.lng), lat: String(poi.lat),
    address: poi.address || "", tag: poi.tag, phone: poi.phone || "", notes: poi.notes || "", amapPoiId: poi.amapPoiId,
  });

  return (
    <section className="poi-manager">
      <div className="poi-manager-head"><div><b>地点库</b><small>{pois.length} 个地点</small></div><div><button onClick={() => setShowOnlineSearch(true)}><Search size={17} />搜索添加</button><button className="primary" onClick={() => setDraft(emptyDraft())}><Plus size={17} />新增</button></div></div>
      <div className="poi-searchbar"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索已有地点" /><Filter size={16} /></div>
      <div className="poi-filter-chips">
        <button className={tag === "all" ? "active" : ""} onClick={() => setTag("all")}>全部</button>
        {(Object.keys(tagLabels) as PoiTag[]).map((value) => <button key={value} className={tag === value ? "active" : ""} onClick={() => setTag(value)}>{tagLabels[value]}</button>)}
      </div>
      <div className="poi-manager-list">
        {filtered.map((poi) => {
          const Icon = tagIcons[poi.tag];
          return <button key={poi.id} onClick={() => editPoi(poi)}><span className={`poi-icon ${poi.tag}`}><Icon size={19} /></span><span><b>{poi.name}</b><small>{poi.address || tagLabels[poi.tag]}</small></span><em>{tagLabels[poi.tag]}</em></button>;
        })}
        {!filtered.length && <div className="poi-no-result"><MapPin size={32} /><b>没有匹配的地点</b><span>可以调整筛选条件或搜索添加新 POI</span></div>}
      </div>
      {draft && <PoiEditorSheet draft={draft} userId={userId} projectId={projectId} onClose={() => setDraft(null)} onSaved={async () => { setDraft(null); await onChanged(); }} />}
      {showOnlineSearch && <PoiSearchSheet userId={userId} projectId={projectId} onClose={() => setShowOnlineSearch(false)} onChoose={(result) => { setShowOnlineSearch(false); setDraft(result); }} />}
    </section>
  );
}

function PoiEditorSheet({ draft: initial, userId, projectId, onClose, onSaved }: { draft: Draft; userId: string; projectId: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const patch = (updates: Partial<Draft>) => setDraft((value) => ({ ...value, ...updates }));
  const locate = () => navigator.geolocation?.getCurrentPosition((position) => patch({ lng: String(position.coords.longitude), lat: String(position.coords.latitude) }), () => setError("无法读取当前位置，请检查定位权限"), { enableHighAccuracy: true });
  const save = async () => {
    const lng = Number(draft.lng), lat = Number(draft.lat);
    if (!draft.name.trim() || !Number.isFinite(lng) || !Number.isFinite(lat)) { setError("请填写名称及有效经纬度"); return; }
    setSaving(true); setError("");
    const data = { name: draft.name.trim(), lng, lat, address: draft.address.trim(), tag: draft.tag, phone: draft.phone.trim(), notes: draft.notes.trim(), amapPoiId: draft.amapPoiId };
    try {
      if (draft.id) await mobilePoiApi.update(userId, projectId, draft.id, data);
      else await mobilePoiApi.create(userId, projectId, data);
      await onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "保存失败"); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!draft.id || !confirm(`确定删除“${draft.name}”吗？关联路线也可能被删除。`)) return;
    setSaving(true);
    try { await mobilePoiApi.delete(userId, projectId, draft.id); await onSaved(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "删除失败"); setSaving(false); }
  };
  return <div className="mobile-sheet-backdrop" onClick={onClose}><div className="mobile-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-title"><div><b>{draft.id ? "编辑 POI" : "新增 POI"}</b><small>地点信息会与桌面端同步</small></div><button onClick={onClose}><X size={20} /></button></div><div className="sheet-body">
    <label>名称 *<input value={draft.name} onChange={(event) => patch({ name: event.target.value })} placeholder="地点名称" /></label>
    <label>地点类型<div className="sheet-tag-grid">{(Object.keys(tagLabels) as PoiTag[]).map((value) => { const Icon = tagIcons[value]; return <button key={value} className={draft.tag === value ? "active" : ""} onClick={() => patch({ tag: value })}><Icon size={16} />{tagLabels[value]}</button>; })}</div></label>
    <label>地址<input value={draft.address} onChange={(event) => patch({ address: event.target.value })} placeholder="详细地址" /></label>
    <div className="coordinate-row"><label>经度<input inputMode="decimal" value={draft.lng} onChange={(event) => patch({ lng: event.target.value })} /></label><label>纬度<input inputMode="decimal" value={draft.lat} onChange={(event) => patch({ lat: event.target.value })} /></label><button onClick={locate}><Crosshair size={18} /></button></div>
    <label>联系电话<input inputMode="tel" value={draft.phone} onChange={(event) => patch({ phone: event.target.value })} placeholder="可选" /></label>
    <label>备注<textarea rows={3} value={draft.notes} onChange={(event) => patch({ notes: event.target.value })} placeholder="营业时间、门票或其他提示" /></label>
    {error && <div className="sheet-error">{error}</div>}
  </div><div className="sheet-actions">{draft.id && <button className="delete" onClick={() => void remove()} disabled={saving}><Trash2 size={17} />删除</button>}<button className="save" onClick={() => void save()} disabled={saving}>{saving ? "保存中..." : "保存地点"}</button></div></div></div>;
}

function PoiSearchSheet({ userId, projectId, onClose, onChoose }: { userId: string; projectId: string; onClose: () => void; onChoose: (draft: Draft) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AmapPoiResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const search = async (mode: "keyword" | "address") => {
    if (!query.trim()) return;
    setSearching(true); setError(""); setResults([]);
    try {
      if (mode === "keyword") setResults(await searchAmapPois(query.trim()));
      else {
        const result = await geocodeWithAmap(query.trim());
        if (result) setResults([{ id: "", name: query.trim(), location: `${result.lng},${result.lat}`, address: result.formattedAddress || query.trim(), type: "", typecode: "" }]);
        else setError("未能解析这个地址");
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "搜索失败"); }
    finally { setSearching(false); }
  };
  const coordinate = () => {
    const parts = query.trim().split(/[,，\s]+/).map(Number);
    if (parts.length >= 2 && parts.every(Number.isFinite)) onChoose({ ...emptyDraft(), name: "坐标地点", lng: String(parts[0]), lat: String(parts[1]) });
    else setError("请输入“经度, 纬度”格式");
  };
  return <div className="mobile-sheet-backdrop" onClick={onClose}><div className="mobile-sheet search-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-title"><div><b>搜索并添加 POI</b><small>高德关键词、地址或经纬度</small></div><button onClick={onClose}><X size={20} /></button></div><div className="online-search"><div><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void search("keyword")} placeholder="景点、酒店、地址或坐标" /></div><span><button onClick={() => void search("keyword")}>关键词</button><button onClick={() => void search("address")}>地址解析</button><button onClick={coordinate}>坐标</button></span></div>{searching && <div className="searching-row">正在搜索...</div>}{error && <div className="sheet-error search-error">{error}</div>}<div className="online-results">{results.map((result) => <button key={`${result.id}-${result.location}-${result.name}`} onClick={() => { const [lng, lat] = result.location.split(","); onChoose({ ...emptyDraft(), name: result.name, lng, lat, address: result.address || "", phone: result.tel || "", amapPoiId: result.id || undefined }); }}><MapPin size={18} /><span><b>{result.name}</b><small>{result.address || result.location}</small></span><Plus size={18} /></button>)}</div></div></div>;
}
