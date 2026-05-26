// ========== Schedule Database Queries ==========
import { getDb } from "./connection";
import type { Day, ScheduleItem } from "@/types";

function rowToDay(row: Record<string, unknown>, items: ScheduleItem[] = []): Day {
  return {
    id: row.id as string,
    projectId: (row.project_id as string) || "default",
    dayNumber: row.day_number as number,
    date: (row.date as string) || null,
    label: (row.label as string) || null,
    accommodationId: (row.accommodation_id as string) || null,
    items,
    notesContent: (row.notes_content as string) || "",
    notesMentions: JSON.parse((row.notes_mentions as string) || "[]"),
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
  };
}

function rowToItem(row: Record<string, unknown>): ScheduleItem {
  return {
    id: row.id as string,
    dayId: row.day_id as string,
    poiId: row.poi_id as string,
    order: (row.item_order as number) || 0,
    arrivalTime: (row.arrival_time as string) || null,
    departureTime: (row.departure_time as string) || null,
    stayDuration: {
      hours: (row.stay_hours as number) || 0,
      minutes: (row.stay_minutes as number) || 0,
    },
    fromEdgeId: (row.from_edge_id as string) || null,
    notes: (row.notes as string) || "",
  };
}

export function getAllDays(): Day[] {
  const db = getDb();
  const dayRows = db.prepare("SELECT * FROM days ORDER BY day_number").all() as Record<string, unknown>[];
  return dayRows.map((row) => {
    const itemRows = db.prepare(
      "SELECT * FROM schedule_items WHERE day_id = ? ORDER BY item_order"
    ).all(row.id) as Record<string, unknown>[];
    return rowToDay(row, itemRows.map(rowToItem));
  });
}

export function getDayById(id: string): Day | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM days WHERE id = ?").get(id);
  if (!row) return null;
  const itemRows = db.prepare(
    "SELECT * FROM schedule_items WHERE day_id = ? ORDER BY item_order"
  ).all(id) as Record<string, unknown>[];
  return rowToDay(row as Record<string, unknown>, itemRows.map(rowToItem));
}

export function insertDay(day: Day): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO days (id, project_id, day_number, date, label, accommodation_id, notes_content, notes_mentions, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    day.id, day.projectId, day.dayNumber, day.date, day.label,
    day.accommodationId, day.notesContent, JSON.stringify(day.notesMentions),
    day.createdAt, day.updatedAt
  );
}

export function updateDayInDb(id: string, updates: Partial<Day>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.dayNumber !== undefined) { fields.push("day_number = ?"); values.push(updates.dayNumber); }
  if (updates.date !== undefined) { fields.push("date = ?"); values.push(updates.date); }
  if (updates.label !== undefined) { fields.push("label = ?"); values.push(updates.label); }
  if (updates.accommodationId !== undefined) { fields.push("accommodation_id = ?"); values.push(updates.accommodationId); }
  if (updates.notesContent !== undefined) { fields.push("notes_content = ?"); values.push(updates.notesContent); }
  if (updates.notesMentions !== undefined) { fields.push("notes_mentions = ?"); values.push(JSON.stringify(updates.notesMentions)); }

  fields.push("updated_at = datetime('now')");
  if (fields.length === 1) return;

  values.push(id);
  db.prepare(`UPDATE days SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function deleteDayFromDb(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM days WHERE id = ?").run(id);
}

export function insertScheduleItem(item: ScheduleItem): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO schedule_items (id, day_id, poi_id, item_order, arrival_time, departure_time, stay_hours, stay_minutes, from_edge_id, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(
    item.id, item.dayId, item.poiId, item.order,
    item.arrivalTime, item.departureTime,
    item.stayDuration?.hours ?? 0, item.stayDuration?.minutes ?? 0,
    item.fromEdgeId, item.notes
  );
}

export function updateScheduleItemInDb(id: string, updates: Partial<ScheduleItem>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.order !== undefined) { fields.push("item_order = ?"); values.push(updates.order); }
  if (updates.arrivalTime !== undefined) { fields.push("arrival_time = ?"); values.push(updates.arrivalTime); }
  if (updates.departureTime !== undefined) { fields.push("departure_time = ?"); values.push(updates.departureTime); }
  if (updates.stayDuration?.hours !== undefined) { fields.push("stay_hours = ?"); values.push(updates.stayDuration.hours); }
  if (updates.stayDuration?.minutes !== undefined) { fields.push("stay_minutes = ?"); values.push(updates.stayDuration.minutes); }
  if (updates.fromEdgeId !== undefined) { fields.push("from_edge_id = ?"); values.push(updates.fromEdgeId); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }

  fields.push("updated_at = datetime('now')");
  if (fields.length === 1) return;

  values.push(id);
  db.prepare(`UPDATE schedule_items SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function deleteScheduleItemFromDb(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM schedule_items WHERE id = ?").run(id);
}

export function clearAllSchedule(): void {
  const db = getDb();
  db.prepare("DELETE FROM schedule_items").run();
  db.prepare("DELETE FROM days").run();
}
