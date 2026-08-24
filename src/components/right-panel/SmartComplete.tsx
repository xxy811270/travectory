"use client";

import { useState } from "react";
import { useScheduleStore, useEdgeStore, usePoiStore, useUiStore } from "@/stores";
import { dayApi, scheduleApi } from "@/lib/api-client";
import { formatDistance, formatDuration } from "@/lib/geo";
import type { Day, Edge, POI } from "@/types";
import { toast } from "sonner";

interface RouteOption {
  type: "direct";
  edge: Edge;
  distance: number;
  duration: number;
}

interface IndirectOption {
  type: "indirect";
  intermediates: POI[];
  edges: Edge[];
  totalDistance: number;
  totalDuration: number;
}

interface CompletionOption {
  fromIdx: number;
  toIdx: number;
  fromName: string;
  toName: string;
  options: (RouteOption | IndirectOption)[];
}

export function SmartComplete({ day }: { day: Day }) {
  const edges = useEdgeStore((s) => s.edges);
  const pois = usePoiStore((s) => s.pois);
  const getPoiById = usePoiStore((s) => s.getPoiById);
  const { updateDay, updateItem } = useScheduleStore();
  const setDirty = useUiStore((s) => s.setDirty);
  const [results, setResults] = useState<CompletionOption[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleAnalyze = () => {
    setAnalyzing(true);
    const sorted = [...day.items].sort((a, b) => a.order - b.order);
    const findings: CompletionOption[] = [];
    const poiById = new Map(pois.map((poi) => [poi.id, poi]));
    const adjacency = new Map<string, Array<{ poiId: string; edge: Edge }>>();
    for (const edge of edges) {
      const from = adjacency.get(edge.originId) || [];
      from.push({ poiId: edge.destinationId, edge });
      adjacency.set(edge.originId, from);
      const to = adjacency.get(edge.destinationId) || [];
      to.push({ poiId: edge.originId, edge });
      adjacency.set(edge.destinationId, to);
    }
    const scheduledPoiIds = new Set(sorted.map((item) => item.poiId));

    // A schedule item can only store the edge from its immediately preceding
    // item, so only consecutive POI pairs are valid completion targets.
    for (let from = 0; from < sorted.length - 1; from++) {
      const to = from + 1;
      const fromItem = sorted[from];
      const toItem = sorted[to];
      const fromPoi = getPoiById(fromItem.poiId);
      const toPoi = getPoiById(toItem.poiId);
      if (!fromPoi || !toPoi) continue;

      // Only report if there's NO direct edge already set
      const existingEdge = toItem.fromEdgeId
        ? edges.find(e =>
            e.id === toItem.fromEdgeId && (
              (e.originId === fromItem.poiId && e.destinationId === toItem.poiId) ||
              (e.originId === toItem.poiId && e.destinationId === fromItem.poiId)
            )
          )
        : null;
      if (existingEdge) continue;

      // Find edges connecting these two POIs (in either direction)
      const directEdges = edges.filter(e =>
        (e.originId === fromItem.poiId && e.destinationId === toItem.poiId) ||
        (e.originId === toItem.poiId && e.destinationId === fromItem.poiId)
      );

      // Search paths containing one to three intermediate POIs. Existing
      // schedule POIs are excluded so applying a suggestion never duplicates
      // another already-planned stop.
      const indirects: IndirectOption[] = [];
      const routeKeys = new Set<string>();
      const search = (
        currentPoiId: string,
        visited: Set<string>,
        pathPoiIds: string[],
        pathEdges: Edge[]
      ) => {
        if (pathEdges.length >= 4 || indirects.length >= 24) return;
        for (const next of adjacency.get(currentPoiId) || []) {
          if (visited.has(next.poiId)) continue;
          const nextEdges = [...pathEdges, next.edge];
          if (next.poiId === toItem.poiId) {
            if (nextEdges.length < 2) continue;
            const intermediates = pathPoiIds.map((id) => poiById.get(id)).filter((poi): poi is POI => Boolean(poi));
            if (intermediates.length !== pathPoiIds.length || intermediates.length > 3) continue;
            const key = pathPoiIds.join(">");
            if (routeKeys.has(key)) continue;
            routeKeys.add(key);
            indirects.push({
              type: "indirect",
              intermediates,
              edges: nextEdges,
              totalDistance: nextEdges.reduce((sum, edge) => sum + getEdgeDist(edge), 0),
              totalDuration: nextEdges.reduce((sum, edge) => sum + getEdgeDur(edge), 0),
            });
            continue;
          }
          if (scheduledPoiIds.has(next.poiId) || nextEdges.length >= 4) continue;
          visited.add(next.poiId);
          search(next.poiId, visited, [...pathPoiIds, next.poiId], nextEdges);
          visited.delete(next.poiId);
        }
      };
      search(fromItem.poiId, new Set([fromItem.poiId]), [], []);
      indirects.sort((a, b) => a.totalDuration - b.totalDuration || a.totalDistance - b.totalDistance);

      const options: (RouteOption | IndirectOption)[] = [];
      directEdges.forEach(e => options.push({ type: "direct", edge: e, distance: getEdgeDist(e), duration: getEdgeDur(e) }));
      indirects.slice(0, 12).forEach(o => options.push(o));

      if (options.length > 0) {
        findings.push({ fromIdx: from, toIdx: to, fromName: fromPoi.name, toName: toPoi.name, options });
      }
    }

    setResults(findings.length > 0 ? findings : []);
    setAnalyzing(false);
  };

  const handleApply = async (finding: CompletionOption, opt: RouteOption | IndirectOption) => {
    if (applying) return;
    const sorted = [...day.items].sort((a, b) => a.order - b.order);
    setApplying(true);
    try {
      if (opt.type === "direct") {
        const toItem = sorted[finding.toIdx];
        await scheduleApi.update(toItem.id, { fromEdgeId: opt.edge.id });
        updateItem(toItem.id, { fromEdgeId: opt.edge.id });
      } else {
        const toItem = sorted[finding.toIdx];
        for (let index = 0; index < opt.intermediates.length; index += 1) {
          await scheduleApi.insertAt({
            dayId: day.id,
            poiId: opt.intermediates[index].id,
            insertAt: finding.toIdx + index,
            stayDuration: null,
            fromEdgeId: opt.edges[index].id,
            notes: "",
          });
        }
        await scheduleApi.update(toItem.id, {
          fromEdgeId: opt.edges[opt.edges.length - 1].id,
        });
        updateDay(day.id, await dayApi.get(day.id));
      }

      setDirty(true);
      setResults(prev => prev?.filter(f => !(f.fromIdx === finding.fromIdx && f.toIdx === finding.toIdx)) || null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "应用智能路径失败");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="border-t border-border pt-2 mt-2">
      <button className="w-full py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        onClick={handleAnalyze} disabled={analyzing || applying || day.items.length < 2}>
        {analyzing ? "分析中..." : "智能路径补全"}
      </button>

      {results && results.length === 0 && !analyzing && (
        <div className="text-xs text-success mt-2 text-center py-2">✓ 所有可补全的路径已配置完毕</div>
      )}

      {results && results.length > 0 && (
        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
          {results.map((f, fi) => (
            <div key={fi} className="border border-border rounded p-2 text-xs">
              <div className="font-medium mb-1">{f.fromName} → {f.toName}</div>
              {f.options.map((opt, oi) => (
                <div key={oi} className={`ml-1 p-1.5 rounded mb-1 cursor-pointer hover:ring-1 hover:ring-primary ${
                  opt.type === "direct" ? "bg-green-50" : "bg-yellow-50"
                } ${applying ? "pointer-events-none opacity-60" : ""}`} onClick={() => handleApply(f, opt)}>
                  {opt.type === "direct" ? (() => { const o = opt as RouteOption; return (
                    <div className="flex items-center justify-between">
                      <span>🚗 直达 · {formatDistance(o.distance)} · {formatDuration(o.duration)}</span>
                      <span className="text-[10px] text-primary">应用</span>
                    </div>
                  );})() : (() => { const o = opt as IndirectOption; return (
                    <div className="flex items-center justify-between">
                      <span>🔀 途经 {o.intermediates.map((poi) => poi.name).join(" → ")} · {formatDistance(o.totalDistance)} · {formatDuration(o.totalDuration)}</span>
                      <span className="text-[10px] text-primary">应用</span>
                    </div>
                  );})()}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getEdgeDist(e: Edge): number {
  const rs = e.drivingRoutes.length ? e.drivingRoutes : e.cyclingRoutes.length ? e.cyclingRoutes : e.walkingRoutes;
  const r = rs[e.selectedRouteIndex] || rs[0];
  return r?.distance || e.customRoute?.distance || 0;
}

function getEdgeDur(e: Edge): number {
  const rs = e.drivingRoutes.length ? e.drivingRoutes : e.cyclingRoutes.length ? e.cyclingRoutes : e.walkingRoutes;
  const r = rs[e.selectedRouteIndex] || rs[0];
  return r?.duration || e.customRoute?.duration || 0;
}
