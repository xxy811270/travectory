"use client";

import { useState } from "react";
import { usePoiStore, useMapStore, useUiStore } from "@/stores";
import { POIEditor } from "./POIEditor";
import type { AmapPOIResult } from "@/types";
import { poiApi } from "@/lib/api-client";

interface POISearchPanelProps {
  onClose: () => void;
}

export function POISearchPanel({ onClose }: POISearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AmapPOIResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState<{ lng: number; lat: number } | null>(null);
  const { addPoi } = usePoiStore();
  const focusPoi = useMapStore((s) => s.focusPoi);
  const setDirty = useUiStore((s) => s.setDirty);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const { pois } = await poiApi.search({ keywords: query.trim() });
      setResults(pois);
      if (pois.length === 0) {
        setError("未找到结果");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "搜索失败");
    } finally {
      setSearching(false);
    }
  };

  const handleAddressSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const result = await poiApi.geocode({ address: query.trim() });
      if (result) {
        const poi: AmapPOIResult = {
          id: "",
          name: query.trim(),
          location: `${result.lng},${result.lat}`,
          address: result.formattedAddress || "",
          type: "",
          typecode: "",
        };
        setResults([poi]);
      } else {
        setError("地址解析失败");
      }
    } catch {
      setError("地址解析失败");
    } finally {
      setSearching(false);
    }
  };

  const handleAddFromResult = async (poi: AmapPOIResult) => {
    const [lng, lat] = poi.location.split(",").map(Number);
    const created = await poiApi.create({
      name: poi.name,
      lng,
      lat,
      address: poi.address || "",
      tag: "normal",
      phone: poi.tel || "",
      notes: "",
      amapPoiId: poi.id,
    });
    addPoi(created);
    focusPoi(lng, lat);
    setDirty(true);
    onClose();
  };

  const handleCoordinateAdd = () => {
    if (!query.trim()) return;
    // Try to parse as "lng,lat"
    const parts = query.trim().split(/[,，\s]+/);
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lng) && !isNaN(lat)) {
        setSelectedResult({ lng, lat });
      }
    }
  };

  if (selectedResult) {
    return (
      <POIEditor
        initialLng={selectedResult.lng}
        initialLat={selectedResult.lat}
        onClose={() => {
          setSelectedResult(null);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-xl w-96 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b border-border font-medium text-sm">搜索 POI</div>
        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:border-primary"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="关键词 / 地址 / 经纬度"
              autoFocus
            />
          </div>
          <div className="flex gap-1">
            <button
              className="flex-1 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
              onClick={handleSearch}
              disabled={searching || !query.trim()}
            >
              关键词搜索
            </button>
            <button
              className="flex-1 py-1.5 text-xs border border-border rounded hover:bg-gray-50 disabled:opacity-50"
              onClick={handleAddressSearch}
              disabled={searching || !query.trim()}
            >
              地址解析
            </button>
            <button
              className="px-3 py-1.5 text-xs border border-border rounded hover:bg-gray-50"
              onClick={handleCoordinateAdd}
              disabled={!query.trim()}
            >
              坐标
            </button>
          </div>
        </div>
        {error && <div className="px-3 py-2 text-xs text-danger">{error}</div>}
        {results.length > 0 && (
          <div className="flex-1 overflow-y-auto divide-y divide-border border-t">
            {results.map((poi) => (
              <div
                key={poi.id || `${poi.location}-${poi.name}`}
                className="p-2.5 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleAddFromResult(poi)}
              >
                <div className="text-sm font-medium">{poi.name}</div>
                <div className="text-xs text-text-muted mt-0.5">{poi.address}</div>
                {poi.tel && <div className="text-xs text-text-muted">{poi.tel}</div>}
              </div>
            ))}
          </div>
        )}
        <div className="p-2 border-t border-border">
          <button className="w-full py-1.5 text-xs border border-border rounded hover:bg-gray-50" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
