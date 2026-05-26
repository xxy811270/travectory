"use client";

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { RoadbookProject } from "@/types";
import { TRANSPORT_LABELS } from "@/types";
import { formatDistance, formatDuration } from "@/lib/geo";

function formatTimeStr(t: string | null): string {
  return t || "--:--";
}

export default function ShareViewPage() {
  const params = useParams();
  const shareId = params?.shareId as string;
  const [project, setProject] = useState<RoadbookProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shareId) return;
    fetch(`/api/share/${shareId}`)
      .then((r) => {
        if (!r.ok) throw new Error("链接无效或已过期");
        return r.json();
      })
      .then((data) => {
        setProject(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-text-muted">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-danger">
          <p className="font-bold text-lg">无法访问</p>
          <p className="text-sm mt-1">{error || "路书项目未找到"}</p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<"pois" | "edges" | "schedule">("schedule");

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{project.metadata.name}</h1>
        <p className="text-sm text-text-muted mt-1">
          {project.pois.length} 个POI · {project.edges.length} 条边 · {project.days.length} 天行程
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-4">
        {[
          { key: "schedule" as const, label: `日程 (${project.days.length}天)` },
          { key: "pois" as const, label: `POI节点 (${project.pois.length})` },
          { key: "edges" as const, label: `路线边 (${project.edges.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === tab.key
                ? "text-primary border-primary"
                : "text-text-muted border-transparent hover:text-text"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Schedule tab */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          {project.days.map((day, di) => {
            const items = [...day.items].sort((a, b) => a.order - b.order);
            return (
              <div key={day.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-base">
                    {day.label || `Day ${day.dayNumber}`}
                  </h3>
                  {day.accommodationId && (
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">
                      🏨 {project.pois.find((p) => p.id === day.accommodationId)?.name}
                    </span>
                  )}
                </div>

                {/* Timeline items */}
                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const poi = project.pois.find((p) => p.id === item.poiId);
                    const isHotel = poi?.tag === "hotel";
                    const hasStay = (item.stayDuration?.hours || 0) > 0 || (item.stayDuration?.minutes || 0) > 0;

                    return (
                      <div key={item.id}>
                        <div className={`flex items-start gap-2 p-2 rounded ${
                          isHotel ? "bg-red-50/50" : ""
                        }`}>
                          <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              {isHotel && "🏨 "}{poi?.name || "未命名"}
                            </div>
                            {item.arrivalTime && (
                              <div className="text-xs text-text-muted">
                                到达: {item.arrivalTime}
                                {item.departureTime && ` · 离开: ${item.departureTime}`}
                              </div>
                            )}
                            {hasStay && (
                              <div className="text-xs text-text-muted">
                                停留: {item.stayDuration?.hours || 0}h{item.stayDuration?.minutes || 0}m
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Edge info between this and next */}
                        {idx < items.length - 1 && item.fromEdgeId && (() => {
                          const edge = project.edges.find((e) => e.id === items[idx + 1].fromEdgeId);
                          if (!edge) return null;
                          const routes = edge.drivingRoutes.length > 0 ? edge.drivingRoutes
                            : edge.cyclingRoutes.length > 0 ? edge.cyclingRoutes
                            : edge.walkingRoutes.length > 0 ? edge.walkingRoutes
                            : [];
                          const route = routes[edge.selectedRouteIndex];
                          const dist = route?.distance || edge.customRoute?.distance || 0;
                          const dur = route?.duration || edge.customRoute?.duration || 0;
                          return (
                            <div className="ml-8 pl-4 border-l-2 border-dashed border-border py-1 text-xs text-text-muted">
                              ↓ {TRANSPORT_LABELS[edge.transportMode] || edge.transportMode}
                              {dist > 0 && ` · ${formatDistance(dist)}`}
                              {dur > 0 && ` · ${formatDuration(dur)}`}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>

                {/* Day stats */}
                {items.length > 1 && (
                  <div className="mt-3 pt-2 border-t border-border flex gap-4 text-xs text-text-muted">
                    {(() => {
                      let totalDist = 0, totalDur = 0;
                      items.forEach((it) => {
                        if (it.fromEdgeId) {
                          const edge = project.edges.find((e) => e.id === it.fromEdgeId);
                          if (edge) {
                            const routes = edge.drivingRoutes.length > 0 ? edge.drivingRoutes
                              : edge.cyclingRoutes.length > 0 ? edge.cyclingRoutes : edge.walkingRoutes.length > 0 ? edge.walkingRoutes : [];
                            const r = routes[edge.selectedRouteIndex];
                            if (r) { totalDist += r.distance; totalDur += r.duration; }
                            else if (edge.customRoute) { totalDist += edge.customRoute.distance; totalDur += edge.customRoute.duration; }
                          }
                        }
                      });
                      return (
                        <>
                          <span>总里程: {formatDistance(totalDist)}</span>
                          <span>总耗时: {formatDuration(totalDur)}</span>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Notes */}
                {day.notesContent && (
                  <div
                    className="mt-3 p-3 bg-gray-50 rounded text-xs border border-border"
                    dangerouslySetInnerHTML={{ __html: day.notesContent }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* POIs tab */}
      {activeTab === "pois" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {project.pois.map((poi) => (
            <div key={poi.id} className="border border-border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span>{poi.tag === "hotel" ? "🏨" : poi.tag === "restaurant" ? "🍽" : poi.tag === "gas_station" ? "⛽" : "📍"}</span>
                <span className="font-medium text-sm">{poi.name}</span>
              </div>
              <div className="text-xs text-text-muted mt-1">{poi.address}</div>
              <div className="text-[10px] text-text-muted mt-1">
                {poi.lng.toFixed(4)}, {poi.lat.toFixed(4)}
              </div>
              {poi.notes && (
                <div className="text-xs text-text-muted mt-1 bg-gray-50 p-1 rounded">{poi.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edges tab */}
      {activeTab === "edges" && (
        <div className="space-y-3">
          {project.edges.map((edge) => {
            const origin = project.pois.find((p) => p.id === edge.originId);
            const dest = project.pois.find((p) => p.id === edge.destinationId);
            const routes = edge.drivingRoutes.length > 0 ? edge.drivingRoutes
              : edge.cyclingRoutes.length > 0 ? edge.cyclingRoutes
              : edge.walkingRoutes.length > 0 ? edge.walkingRoutes
              : [];
            return (
              <div key={edge.id} className="border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {TRANSPORT_LABELS[edge.transportMode] || edge.transportMode}
                  </span>
                  <span className="text-sm font-medium">{origin?.name || "?"}</span>
                  <span className="text-text-muted">→</span>
                  <span className="text-sm font-medium">{dest?.name || "?"}</span>
                </div>
                <div className="ml-2 mt-2 space-y-1">
                  {routes.map((r, i) => (
                    <div key={i} className={`text-xs p-1.5 rounded ${i === edge.selectedRouteIndex ? "bg-blue-50" : "bg-gray-50"}`}>
                      {i === edge.selectedRouteIndex && <span className="text-primary">★ </span>}
                      {formatDistance(r.distance)} · {formatDuration(r.duration)}
                      {r.tolls > 0 && ` · 收费${r.tolls}元`}
                    </div>
                  ))}
                  {edge.customRoute && (
                    <div className="text-xs p-1.5 bg-gray-50 rounded">
                      {edge.customRoute.routeName || edge.customRoute.routeNumber || "自定义路线"}
                      {" · "}{formatDistance(edge.customRoute.distance)}
                      {" · "}{formatDuration(edge.customRoute.duration)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <footer className="text-center text-xs text-text-muted py-6 border-t border-border mt-6">
        由 Travectory 生成 · 只读视图 · {new Date(project.exportedAt).toLocaleDateString("zh-CN")}
      </footer>
    </div>
  );
}
