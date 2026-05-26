// ========== POI Database Queries ==========
import { getDb } from "./connection";
import type { POI } from "@/types";

function rowToPoi(row: Record<string, unknown>): POI {
  return {
    id: row.id as string,
    name: row.name as string,
    lng: row.lng as number,
    lat: row.lat as number,
    address: (row.address as string) || "",
    tag: (row.tag as POI["tag"]) || "normal",
    amapPoiId: (row.amap_poi_id as string) || undefined,
    phone: (row.phone as string) || "",
    notes: (row.notes as string) || "",
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
  };
}

export function getAllPois(): POI[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM pois ORDER BY created_at DESC").all();
  return (rows as Record<string, unknown>[]).map(rowToPoi);
}

export function getPoiById(id: string): POI | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM pois WHERE id = ?").get(id);
  return row ? rowToPoi(row as Record<string, unknown>) : null;
}

export function insertPoi(poi: POI): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO pois (id, name, lng, lat, address, tag, amap_poi_id, phone, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    poi.id, poi.name, poi.lng, poi.lat, poi.address, poi.tag,
    poi.amapPoiId || null, poi.phone, poi.notes, poi.createdAt, poi.updatedAt
  );
}

export function updatePoiInDb(id: string, updates: Partial<POI>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
  if (updates.lng !== undefined) { fields.push("lng = ?"); values.push(updates.lng); }
  if (updates.lat !== undefined) { fields.push("lat = ?"); values.push(updates.lat); }
  if (updates.address !== undefined) { fields.push("address = ?"); values.push(updates.address); }
  if (updates.tag !== undefined) { fields.push("tag = ?"); values.push(updates.tag); }
  if (updates.phone !== undefined) { fields.push("phone = ?"); values.push(updates.phone); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }

  fields.push("updated_at = datetime('now')");

  if (fields.length === 1) return; // Only updated_at
  values.push(id);
  db.prepare(`UPDATE pois SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function deletePoiFromDb(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM pois WHERE id = ?").run(id);
}

export function clearAllPois(): void {
  const db = getDb();
  db.prepare("DELETE FROM pois").run();
}
