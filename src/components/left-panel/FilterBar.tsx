"use client";

import { usePoiStore, useEdgeStore } from "@/stores";
import { POI_TAG_LABELS, TRANSPORT_LABELS } from "@/types";
import type { POITag, TransportMode } from "@/types";

export function FilterBar() {
  const filterTag = usePoiStore((s) => s.filterTag);
  const setFilterTag = usePoiStore((s) => s.setFilterTag);
  const filterMode = useEdgeStore((s) => s.filterMode);
  const setFilterMode = useEdgeStore((s) => s.setFilterMode);

  return (
    <div className="p-2 border-b border-border shrink-0 space-y-1.5">
      {/* POI tag filter */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] text-text-muted w-8 shrink-0">POI:</span>
        <button
          className={`text-[10px] px-1.5 py-0.5 rounded ${filterTag === "all" ? "bg-primary text-white" : "bg-gray-100"}`}
          onClick={() => setFilterTag("all")}
        >
          全部
        </button>
        {(Object.entries(POI_TAG_LABELS) as [POITag, string][]).map(([tag, label]) => (
          <button
            key={tag}
            className={`text-[10px] px-1.5 py-0.5 rounded ${filterTag === tag ? "bg-primary text-white" : "bg-gray-100"}`}
            onClick={() => setFilterTag(tag)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Transport mode filter */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] text-text-muted w-8 shrink-0">交通:</span>
        <button
          className={`text-[10px] px-1.5 py-0.5 rounded ${filterMode === "all" ? "bg-primary text-white" : "bg-gray-100"}`}
          onClick={() => setFilterMode("all")}
        >
          全部
        </button>
        {(Object.entries(TRANSPORT_LABELS) as [TransportMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            className={`text-[10px] px-1.5 py-0.5 rounded ${filterMode === mode ? "bg-primary text-white" : "bg-gray-100"}`}
            onClick={() => setFilterMode(mode)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
