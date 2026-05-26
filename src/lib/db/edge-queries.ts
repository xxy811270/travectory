// ========== Edge Database Queries ==========
import { getDb } from "./connection";
import type { Edge, RoutePath, CustomRoute } from "@/types";

function rowToEdge(row: Record<string, unknown>): Edge {
  return {
    id: row.id as string,
    originId: row.origin_id as string,
    destinationId: row.destination_id as string,
    transportMode: row.transport_mode as Edge["transportMode"],
    drivingRoutes: JSON.parse((row.driving_routes as string) || "[]"),
    cyclingRoutes: JSON.parse((row.cycling_routes as string) || "[]"),
    walkingRoutes: JSON.parse((row.walking_routes as string) || "[]"),
    customRoute: row.custom_route ? JSON.parse(row.custom_route as string) : null,
    selectedRouteIndex: (row.selected_route_index as number) || 0,
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
  };
}

export function getAllEdges(): Edge[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM edges ORDER BY created_at DESC").all();
  return (rows as Record<string, unknown>[]).map(rowToEdge);
}

export function getEdgeById(id: string): Edge | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM edges WHERE id = ?").get(id);
  return row ? rowToEdge(row as Record<string, unknown>) : null;
}

export function insertEdge(edge: Edge): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO edges (id, origin_id, destination_id, transport_mode, selected_route_index,
     driving_routes, cycling_routes, walking_routes, custom_route, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    edge.id, edge.originId, edge.destinationId, edge.transportMode,
    edge.selectedRouteIndex,
    JSON.stringify(edge.drivingRoutes), JSON.stringify(edge.cyclingRoutes),
    JSON.stringify(edge.walkingRoutes),
    edge.customRoute ? JSON.stringify(edge.customRoute) : null,
    edge.createdAt, edge.updatedAt
  );
}

export function updateEdgeInDb(id: string, updates: Partial<Edge>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.transportMode !== undefined) { fields.push("transport_mode = ?"); values.push(updates.transportMode); }
  if (updates.selectedRouteIndex !== undefined) { fields.push("selected_route_index = ?"); values.push(updates.selectedRouteIndex); }
  if (updates.drivingRoutes !== undefined) { fields.push("driving_routes = ?"); values.push(JSON.stringify(updates.drivingRoutes)); }
  if (updates.cyclingRoutes !== undefined) { fields.push("cycling_routes = ?"); values.push(JSON.stringify(updates.cyclingRoutes)); }
  if (updates.walkingRoutes !== undefined) { fields.push("walking_routes = ?"); values.push(JSON.stringify(updates.walkingRoutes)); }
  if (updates.customRoute !== undefined) { fields.push("custom_route = ?"); values.push(updates.customRoute ? JSON.stringify(updates.customRoute) : null); }

  fields.push("updated_at = datetime('now')");
  if (fields.length === 1) return;

  values.push(id);
  db.prepare(`UPDATE edges SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function deleteEdgeFromDb(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM edges WHERE id = ?").run(id);
}

export function clearAllEdges(): void {
  const db = getDb();
  db.prepare("DELETE FROM edges").run();
}
