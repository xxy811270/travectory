import type { Day, Edge, Poi, Project, ProjectListItem } from "../types";
import { parseRoadbookFile, serializeRoadbook, type RoadbookFile, type RoadbookMetadata } from "./roadbook-format";

const DB_NAME = "travectory-mobile";
const DB_VERSION = 1;
const ROADBOOKS = "roadbooks";
const SNAPSHOTS = "snapshots";
const MAX_SNAPSHOTS = 5;

export interface LocalRoadbook {
  id: string;
  metadata: RoadbookMetadata;
  pois: Poi[];
  edges: Edge[];
  days: Day[];
  updatedAt: string;
}

export interface ImportSnapshot {
  id: string;
  projectId: string;
  createdAt: string;
  reason: string;
  roadbook: LocalRoadbook;
}

export async function listLocalRoadbooks(): Promise<ProjectListItem[]> {
  const books = await getAll<LocalRoadbook>(ROADBOOKS);
  return books.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(toListItem);
}

export async function getLocalRoadbook(projectId: string): Promise<{ project: Project; days: Day[]; pois: Poi[]; edges: Edge[] }> {
  const book = await getOne<LocalRoadbook>(ROADBOOKS, projectId);
  if (!book) throw new Error("本地路书不存在");
  return { project: { name: book.metadata.name, description: book.metadata.description }, days: clone(book.days).sort((a, b) => a.dayNumber - b.dayNumber), pois: clone(book.pois), edges: clone(book.edges) };
}

export async function importAsNewRoadbook(input: unknown): Promise<ProjectListItem> {
  const file = parseRoadbookFile(input);
  const projectId = uid();
  const book = remapRoadbook(file, projectId);
  await putOne(ROADBOOKS, book);
  return toListItem(book);
}

export async function createEmptyRoadbook(name: string, description = ""): Promise<ProjectListItem> {
  const now = new Date().toISOString();
  const book: LocalRoadbook = { id: uid(), metadata: { name: name.trim() || "未命名路书", description, coverImage: null, createdAt: now, updatedAt: now }, pois: [], edges: [], days: [], updatedAt: now };
  await putOne(ROADBOOKS, book);
  return toListItem(book);
}

export async function mutateLocalRoadbook<T>(projectId: string, mutation: (book: LocalRoadbook) => T): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(ROADBOOKS, "readwrite");
    const store = tx.objectStore(ROADBOOKS);
    const request = store.get(projectId);
    let result: T;
    request.onsuccess = () => {
      if (!request.result) { tx.abort(); reject(new Error("本地路书不存在")); return; }
      try {
        const book = request.result as LocalRoadbook;
        result = mutation(book);
        const now = new Date().toISOString();
        book.updatedAt = now; book.metadata.updatedAt = now;
        store.put(book);
      } catch (error) { tx.abort(); reject(error); }
    };
    tx.oncomplete = () => resolve(result!);
    tx.onerror = () => reject(tx.error || new Error("本地数据写入失败"));
    tx.onabort = () => reject(tx.error || new Error("本地数据写入已取消"));
  });
}

export async function replaceLocalRoadbook(projectId: string, input: unknown, reason = "外部文件覆盖"): Promise<ProjectListItem> {
  const file = parseRoadbookFile(input);
  const current = await getOne<LocalRoadbook>(ROADBOOKS, projectId);
  if (!current) throw new Error("要覆盖的本地路书不存在");
  const replacement = remapRoadbook(file, projectId);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([ROADBOOKS, SNAPSHOTS], "readwrite");
    tx.objectStore(SNAPSHOTS).put({ id: uid(), projectId, createdAt: new Date().toISOString(), reason, roadbook: clone(current) } satisfies ImportSnapshot);
    tx.objectStore(ROADBOOKS).put(replacement);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
  await trimSnapshots(projectId);
  return toListItem(replacement);
}

export async function undoLastImport(projectId: string): Promise<ProjectListItem> {
  const snapshots = (await getAll<ImportSnapshot>(SNAPSHOTS)).filter((item) => item.projectId === projectId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latest = snapshots[0];
  if (!latest) throw new Error("没有可撤回的导入记录");
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([ROADBOOKS, SNAPSHOTS], "readwrite");
    tx.objectStore(ROADBOOKS).put({ ...latest.roadbook, updatedAt: new Date().toISOString() });
    tx.objectStore(SNAPSHOTS).delete(latest.id);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
  return toListItem(latest.roadbook);
}

export async function exportLocalRoadbook(projectId: string): Promise<RoadbookFile> {
  const book = await getOne<LocalRoadbook>(ROADBOOKS, projectId);
  if (!book) throw new Error("本地路书不存在");
  return serializeRoadbook({ metadata: book.metadata, pois: book.pois, edges: book.edges, days: book.days });
}

export async function hasImportSnapshot(projectId: string): Promise<boolean> { return (await getAll<ImportSnapshot>(SNAPSHOTS)).some((item) => item.projectId === projectId); }

function remapRoadbook(file: RoadbookFile, projectId: string): LocalRoadbook {
  const poiIds = new Map(file.pois.map((poi) => [poi.id, uid()]));
  const edgeIds = new Map(file.edges.map((edge) => [edge.id, uid()]));
  const dayIds = new Map(file.days.map((day) => [day.id, uid()]));
  const pois = file.pois.map((poi) => ({ ...clone(poi), id: poiIds.get(poi.id)! }));
  const edges = file.edges.map((edge) => ({ ...clone(edge), id: edgeIds.get(edge.id)!, originId: poiIds.get(edge.originId)!, destinationId: poiIds.get(edge.destinationId)! }));
  const days = file.days.map((day) => ({ ...clone(day), id: dayIds.get(day.id)!, dayNumber: day.dayNumber, accommodationId: day.accommodationId ? poiIds.get(day.accommodationId) || null : null, items: day.items.map((item) => ({ ...clone(item), id: uid(), dayId: dayIds.get(day.id)!, poiId: poiIds.get(item.poiId)!, fromEdgeId: item.fromEdgeId ? edgeIds.get(item.fromEdgeId) || null : null })) }));
  const now = new Date().toISOString();
  return { id: projectId, metadata: { ...file.metadata, updatedAt: now }, pois, edges, days, updatedAt: now };
}

function toListItem(book: LocalRoadbook): ProjectListItem { return { id: book.id, userId: "local", name: book.metadata.name, description: book.metadata.description, poiCount: book.pois.length, edgeCount: book.edges.length, dayCount: book.days.length, updatedAt: book.updatedAt }; }
function clone<T>(value: T): T { return structuredClone(value); }
function uid(): string { return crypto.randomUUID(); }

async function trimSnapshots(projectId: string): Promise<void> {
  const snapshots = (await getAll<ImportSnapshot>(SNAPSHOTS)).filter((item) => item.projectId === projectId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await Promise.all(snapshots.slice(MAX_SNAPSHOTS).map((item) => deleteOne(SNAPSHOTS, item.id)));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(ROADBOOKS)) db.createObjectStore(ROADBOOKS, { keyPath: "id" }); if (!db.objectStoreNames.contains(SNAPSHOTS)) db.createObjectStore(SNAPSHOTS, { keyPath: "id" }); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function getAll<T>(store: string): Promise<T[]> { const db = await openDb(); return new Promise((resolve, reject) => { const request = db.transaction(store, "readonly").objectStore(store).getAll(); request.onsuccess = () => resolve(request.result as T[]); request.onerror = () => reject(request.error); }); }
async function getOne<T>(store: string, key: IDBValidKey): Promise<T | undefined> { const db = await openDb(); return new Promise((resolve, reject) => { const request = db.transaction(store, "readonly").objectStore(store).get(key); request.onsuccess = () => resolve(request.result as T | undefined); request.onerror = () => reject(request.error); }); }
async function putOne<T>(store: string, value: T): Promise<void> { const db = await openDb(); return new Promise((resolve, reject) => { const tx = db.transaction(store, "readwrite"); tx.objectStore(store).put(value); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
async function deleteOne(store: string, key: IDBValidKey): Promise<void> { const db = await openDb(); return new Promise((resolve, reject) => { const tx = db.transaction(store, "readwrite"); tx.objectStore(store).delete(key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
