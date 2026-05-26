"use client";

import { useState } from "react";
import { usePoiStore, useUiStore } from "@/stores";
import { POI_TAG_LABELS } from "@/types";
import type { POI, POITag, POICreateInput } from "@/types";
import { poiApi } from "@/lib/api-client";

interface POIEditorProps {
  poi?: POI;
  initialLng?: number;
  initialLat?: number;
  onClose: () => void;
}

export function POIEditor({ poi, initialLng, initialLat, onClose }: POIEditorProps) {
  const isEdit = !!poi;
  const { addPoi, updatePoi, removePoi } = usePoiStore();
  const setDirty = useUiStore((s) => s.setDirty);

  const [name, setName] = useState(poi?.name || "");
  const [lng, setLng] = useState(String(poi?.lng ?? initialLng ?? ""));
  const [lat, setLat] = useState(String(poi?.lat ?? initialLat ?? ""));
  const [address, setAddress] = useState(poi?.address || "");
  const [tag, setTag] = useState<POITag>(poi?.tag || "normal");
  const [notes, setNotes] = useState(poi?.notes || "");
  const [phone, setPhone] = useState(poi?.phone || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !lng || !lat) return;
    setSaving(true);

    const now = new Date().toISOString();

    if (isEdit && poi) {
      const updates = {
        name: name.trim(),
        lng: parseFloat(lng),
        lat: parseFloat(lat),
        address,
        tag,
        notes,
        phone,
        updatedAt: now,
      };
      updatePoi(poi.id, updates);
      await poiApi.update(poi.id, updates);
    } else {
      const created = await poiApi.create({
        name: name.trim(),
        lng: parseFloat(lng),
        lat: parseFloat(lat),
        address,
        tag,
        notes,
        phone,
        amapPoiId: undefined,
      });
      addPoi(created);
    }

    setDirty(true);
    setSaving(false);
    onClose();
  };

  const handleDelete = () => {
    if (!poi) return;
    if (!confirm(`确定要删除 POI "${poi.name}" 吗？\n关联的边也会被删除。`)) return;
    removePoi(poi.id);
    poiApi.delete(poi.id);
    setDirty(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-xl w-96 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border font-medium text-sm">
          {isEdit ? "编辑 POI" : "添加 POI"}
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">名称 *</label>
            <input
              className="w-full px-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:border-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="POI 名称"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">经度 *</label>
              <input
                className="w-full px-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:border-primary"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="116.397428"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">纬度 *</label>
              <input
                className="w-full px-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:border-primary"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="39.90923"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">地址</label>
            <input
              className="w-full px-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:border-primary"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="详细地址"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">标签</label>
            <div className="flex gap-1 flex-wrap">
              {(Object.entries(POI_TAG_LABELS) as [POITag, string][]).map(([t, label]) => (
                <button
                  key={t}
                  className={`text-xs px-2 py-1 rounded ${tag === t ? "bg-primary text-white" : "bg-gray-100"}`}
                  onClick={() => setTag(t)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">电话</label>
            <input
              className="w-full px-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:border-primary"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="联系电话"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">备注</label>
            <textarea
              className="w-full px-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:border-primary resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="备注信息..."
              rows={3}
            />
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-between">
          {isEdit && (
            <button
              className="px-3 py-1.5 text-xs text-danger hover:bg-red-50 rounded"
              onClick={handleDelete}
            >
              删除
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              className="px-3 py-1.5 text-xs border border-border rounded hover:bg-gray-50"
              onClick={onClose}
            >
              取消
            </button>
            <button
              className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
              onClick={handleSave}
              disabled={!name.trim() || !lng || !lat || saving}
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
