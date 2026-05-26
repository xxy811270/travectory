"use client";

import { useState } from "react";
import type { RoutePath } from "@/types";
import { formatDistance, formatDuration } from "@/lib/geo";

interface RouteAlternativeListProps {
  routes: RoutePath[];
  selectedIndices: number[];
  defaultIndex: number;
  onToggleRoute: (index: number) => void;
  onSetDefault: (index: number) => void;
  onNameRoute: (index: number, name: string) => void;
  routeNames: Record<number, string>;
}

const DRIVING_STRATEGIES: Record<string, string> = {
  "0": "最快路线",
  "1": "避免收费",
  "2": "最短距离",
  "3": "不走高速",
  "4": "躲避拥堵",
  "5": "不走高速且避免收费",
  "6": "不走高速且躲避拥堵",
  "7": "避免收费且躲避拥堵",
  "8": "不走高速+避免收费+躲避拥堵",
};

export function RouteAlternativeList({
  routes,
  selectedIndices,
  defaultIndex,
  onToggleRoute,
  onSetDefault,
  onNameRoute,
  routeNames,
}: RouteAlternativeListProps) {
  const [editingNameIdx, setEditingNameIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const startEdit = (idx: number) => {
    setEditName(routeNames[idx] || "");
    setEditingNameIdx(idx);
  };

  const saveEdit = (idx: number) => {
    onNameRoute(idx, editName.trim());
    setEditingNameIdx(null);
  };

  if (routes.length === 0) {
    return (
      <div className="text-xs text-text-muted p-2 text-center">
        暂无可选路线方案
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-60 overflow-y-auto">
      {routes.map((route, idx) => {
        const isSelected = selectedIndices.includes(idx);
        const isDefault = defaultIndex === idx;
        return (
          <div
            key={idx}
            className={`border rounded p-2 text-xs ${isSelected ? "border-primary bg-blue-50" : "border-border"}`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleRoute(idx)}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                {editingNameIdx === idx ? (
                  <input
                    className="w-full px-1 py-0.5 text-xs border rounded"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => saveEdit(idx)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(idx)}
                    autoFocus
                  />
                ) : (
                  <div
                    className="font-medium truncate cursor-pointer hover:text-primary"
                    onDoubleClick={() => startEdit(idx)}
                  >
                    {routeNames[idx] || `方案 ${idx + 1}`}
                    {isDefault && <span className="text-primary ml-1">(默认)</span>}
                  </div>
                )}
                <div className="text-text-muted">
                  {formatDistance(route.distance)} · {formatDuration(route.duration)}
                  {route.tolls > 0 && ` · 收费${route.tolls}元`}
                </div>
                {route.strategy && (
                  <div className="text-[10px] text-text-muted">
                    {DRIVING_STRATEGIES[route.strategy] || route.strategy}
                  </div>
                )}
              </div>
              {isSelected && (
                <div className="flex gap-1 shrink-0">
                  <button
                    className="text-[10px] px-1 py-0.5 rounded hover:bg-gray-200"
                    onClick={() => startEdit(idx)}
                    title="重命名"
                  >
                    ✏️
                  </button>
                  <button
                    className={`text-[10px] px-1 py-0.5 rounded ${isDefault ? "bg-primary text-white" : "hover:bg-gray-200"}`}
                    onClick={() => onSetDefault(idx)}
                    title={isDefault ? "已是默认" : "设为默认"}
                  >
                    {isDefault ? "★" : "☆"}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
