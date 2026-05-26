"use client";

import { useState } from "react";
import { POIList } from "./POIList";
import { EdgeList } from "./EdgeList";
import { POIEditor } from "./POIEditor";
import { POISearchPanel } from "./POISearchPanel";
import { FilterBar } from "./FilterBar";
import { useEdgeStore } from "@/stores";
import { EdgeEditor } from "./EdgeEditor";
import { EdgeDetail } from "./EdgeDetail";

export function LeftPanel() {
  const [tab, setTab] = useState<"pois" | "edges">("pois");
  const [showAddPoi, setShowAddPoi] = useState(false);
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showEdgeDetail, setShowEdgeDetail] = useState(false);
  const selectedEdgeId = useEdgeStore((s) => s.selectedEdgeId);
  const selectEdge = useEdgeStore((s) => s.selectEdge);

  return (
    <div className="h-full bg-surface overflow-hidden flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <button
          className={`flex-1 py-2 text-xs font-medium ${tab === "pois" ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text"}`}
          onClick={() => setTab("pois")}
        >
          POI 节点
        </button>
        <button
          className={`flex-1 py-2 text-xs font-medium ${tab === "edges" ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text"}`}
          onClick={() => setTab("edges")}
        >
          路线边
        </button>
      </div>

      <FilterBar />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "pois" ? <POIList /> : <EdgeList />}
      </div>

      {/* Bottom actions */}
      <div className="p-2 border-t border-border shrink-0 flex gap-1">
        {tab === "pois" && (
          <>
            <button
              className="flex-1 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary-dark"
              onClick={() => setShowAddPoi(true)}
            >
              + 添加 POI
            </button>
            <button
              className="px-3 py-1.5 text-xs border border-border rounded hover:bg-gray-50"
              onClick={() => setShowSearch(true)}
            >
              搜索
            </button>
          </>
        )}
        {tab === "edges" && (
          <button
            className="flex-1 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary-dark"
            onClick={() => setShowAddEdge(true)}
          >
            + 添加边
          </button>
        )}
      </div>

      {showAddPoi && <POIEditor onClose={() => setShowAddPoi(false)} />}
      {showSearch && <POISearchPanel onClose={() => setShowSearch(false)} />}
      {showAddEdge && <EdgeEditor onClose={() => setShowAddEdge(false)} />}
      {selectedEdgeId && (
        <EdgeDetail
          edgeId={selectedEdgeId}
          onClose={() => selectEdge(null)}
        />
      )}
    </div>
  );
}
