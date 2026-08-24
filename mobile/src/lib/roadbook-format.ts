import type { Day, Edge, Poi } from "../types";

export const ROADBOOK_FORMAT = "travectory-roadbook";
export const ROADBOOK_FORMAT_VERSION = 2;

export interface RoadbookMetadata {
  name: string;
  description: string;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoadbookFile {
  format: typeof ROADBOOK_FORMAT;
  formatVersion: typeof ROADBOOK_FORMAT_VERSION;
  version: string;
  metadata: RoadbookMetadata;
  pois: Poi[];
  edges: Edge[];
  days: Day[];
  exportedAt: string;
}

export interface RoadbookSummary {
  name: string;
  description: string;
  poiCount: number;
  edgeCount: number;
  dayCount: number;
  scheduleCount: number;
  exportedAt: string;
  sourceVersion: string;
}

export function parseRoadbookFile(input: unknown): RoadbookFile {
  if (!isRecord(input)) throw new Error("文件内容不是有效的路书对象");
  const pois = requiredArray(input.pois, "POI");
  const edges = requiredArray(input.edges, "路线");
  const days = requiredArray(input.days, "日程");
  if (!isRecord(input.metadata)) throw new Error("路书缺少 metadata");

  const normalized: RoadbookFile = {
    format: ROADBOOK_FORMAT,
    formatVersion: ROADBOOK_FORMAT_VERSION,
    version: typeof input.version === "string" ? input.version : "1.0",
    metadata: {
      name: requiredText(input.metadata.name, "路书名称"),
      description: text(input.metadata.description),
      coverImage: typeof input.metadata.coverImage === "string" ? input.metadata.coverImage : null,
      createdAt: timestamp(input.metadata.createdAt),
      updatedAt: timestamp(input.metadata.updatedAt),
    },
    pois: pois.map(normalizePoi),
    edges: edges.map(normalizeEdge),
    days: days.map(normalizeDay),
    exportedAt: timestamp(input.exportedAt),
  };
  validateReferences(normalized);
  return normalized;
}

export function summarizeRoadbook(file: RoadbookFile): RoadbookSummary {
  return {
    name: file.metadata.name,
    description: file.metadata.description,
    poiCount: file.pois.length,
    edgeCount: file.edges.length,
    dayCount: file.days.length,
    scheduleCount: file.days.reduce((sum, day) => sum + day.items.length, 0),
    exportedAt: file.exportedAt,
    sourceVersion: file.version,
  };
}

export function serializeRoadbook(data: { metadata: RoadbookMetadata; pois: Poi[]; edges: Edge[]; days: Day[] }): RoadbookFile {
  return parseRoadbookFile({
    format: ROADBOOK_FORMAT,
    formatVersion: ROADBOOK_FORMAT_VERSION,
    version: "2.0",
    metadata: data.metadata,
    pois: data.pois,
    edges: data.edges,
    days: data.days,
    exportedAt: new Date().toISOString(),
  });
}

function normalizePoi(value: unknown): Poi {
  if (!isRecord(value)) throw new Error("存在无效 POI");
  const lng = Number(value.lng), lat = Number(value.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) throw new Error(`POI“${text(value.name)}”坐标无效`);
  const allowed = new Set(["normal", "hotel", "restaurant", "gas_station"]);
  return { ...value, id: requiredText(value.id, "POI ID"), name: requiredText(value.name, "POI 名称"), lng, lat, address: text(value.address), tag: (allowed.has(String(value.tag)) ? value.tag : "normal") as Poi["tag"], phone: text(value.phone), notes: text(value.notes), amapPoiId: typeof value.amapPoiId === "string" ? value.amapPoiId : undefined } as Poi;
}

function normalizeEdge(value: unknown): Edge {
  if (!isRecord(value)) throw new Error("存在无效路线");
  return { ...value, id: requiredText(value.id, "路线 ID"), originId: requiredText(value.originId, "路线起点"), destinationId: requiredText(value.destinationId, "路线终点"), transportMode: requiredText(value.transportMode, "交通方式"), selectedRouteIndex: Math.max(0, Number(value.selectedRouteIndex) || 0), drivingRoutes: array(value.drivingRoutes), cyclingRoutes: array(value.cyclingRoutes), walkingRoutes: array(value.walkingRoutes), customRoute: isRecord(value.customRoute) ? value.customRoute : null } as unknown as Edge;
}

function normalizeDay(value: unknown): Day {
  if (!isRecord(value)) throw new Error("存在无效日程");
  const id = requiredText(value.id, "日程 ID");
  return { ...value, id, dayNumber: Math.max(1, Number(value.dayNumber) || 1), date: typeof value.date === "string" ? value.date : null, label: typeof value.label === "string" ? value.label : null, items: requiredArray(value.items, "日程项目").map((item, index) => {
    if (!isRecord(item)) throw new Error("存在无效日程项目");
    return { ...item, id: requiredText(item.id, "日程项目 ID"), dayId: typeof item.dayId === "string" ? item.dayId : id, poiId: requiredText(item.poiId, "日程 POI"), order: Number.isFinite(Number(item.order)) ? Number(item.order) : index, fromEdgeId: typeof item.fromEdgeId === "string" ? item.fromEdgeId : null };
  }), accommodationId: typeof value.accommodationId === "string" ? value.accommodationId : null, notesContent: text(value.notesContent), notesMentions: array(value.notesMentions).filter((item): item is string => typeof item === "string") } as Day;
}

function validateReferences(file: RoadbookFile): void {
  const poiIds = uniqueIds(file.pois, "POI");
  const edgeIds = uniqueIds(file.edges, "路线");
  uniqueIds(file.days, "日程");
  for (const edge of file.edges) if (!poiIds.has(edge.originId) || !poiIds.has(edge.destinationId)) throw new Error(`路线 ${edge.id} 引用了不存在的 POI`);
  const itemIds = new Set<string>();
  for (const day of file.days) {
    if (day.accommodationId && !poiIds.has(day.accommodationId)) throw new Error(`${day.label || `Day ${day.dayNumber}`} 的住宿点不存在`);
    for (const item of day.items) {
      if (itemIds.has(item.id)) throw new Error(`日程项目 ID 重复：${item.id}`);
      itemIds.add(item.id);
      if (!poiIds.has(item.poiId)) throw new Error(`日程项目 ${item.id} 引用了不存在的 POI`);
      if (item.fromEdgeId && !edgeIds.has(item.fromEdgeId)) throw new Error(`日程项目 ${item.id} 引用了不存在的路线`);
    }
  }
}

function uniqueIds(items: Array<{ id: string }>, label: string): Set<string> { const ids = new Set<string>(); for (const item of items) { if (ids.has(item.id)) throw new Error(`${label} ID 重复：${item.id}`); ids.add(item.id); } return ids; }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function requiredArray(value: unknown, label: string): unknown[] { if (!Array.isArray(value)) throw new Error(`路书缺少${label}数据`); return value; }
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function requiredText(value: unknown, label: string): string { const result = text(value).trim(); if (!result) throw new Error(`${label}不能为空`); return result; }
function timestamp(value: unknown): string { return typeof value === "string" && value ? value : new Date().toISOString(); }
