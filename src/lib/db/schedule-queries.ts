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

function applyDayOrder(db: ReturnType<typeof getDb>, dayIds: string[]): void {
  const setNumber = db.prepare("UPDATE days SET day_number = ?, updated_at = datetime('now') WHERE id = ?");
  // Move every row into a collision-free temporary range before assigning
  // positive numbers because (project_id, day_number) is unique.
  dayIds.forEach((id, index) => setNumber.run(-1000000 - index, id));
  dayIds.forEach((id, index) => setNumber.run(index + 1, id));
}

export function insertDayAtPosition(day: Day, requestedPosition: number): Day {
  const db = getDb();
  const insert = db.transaction(() => {
    const existingIds = (db.prepare("SELECT id FROM days ORDER BY day_number").all() as Array<{ id: string }>).map((row) => row.id);
    const position = Math.max(1, Math.min(existingIds.length + 1, Math.trunc(requestedPosition)));
    day.dayNumber = -2000000;
    insertDay(day);
    existingIds.splice(position - 1, 0, day.id);
    applyDayOrder(db, existingIds);
  });
  insert();
  const created = getDayById(day.id);
  if (!created) throw new Error("新日程创建失败");
  return created;
}

export function reorderDaysInDb(dayIds: string[]): Day[] {
  const db = getDb();
  const reorder = db.transaction(() => {
    const existingIds = (db.prepare("SELECT id FROM days").all() as Array<{ id: string }>).map((row) => row.id);
    const existing = new Set(existingIds);
    if (
      existingIds.length !== dayIds.length ||
      new Set(dayIds).size !== dayIds.length ||
      dayIds.some((id) => !existing.has(id))
    ) {
      throw new Error("日程天数已发生变化，请刷新后重试");
    }
    applyDayOrder(db, dayIds);
  });
  reorder();
  return getAllDays();
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
  const remove = db.transaction(() => {
    db.prepare("DELETE FROM days WHERE id = ?").run(id);
    const remainingIds = (db.prepare("SELECT id FROM days ORDER BY day_number").all() as Array<{ id: string }>).map((row) => row.id);
    applyDayOrder(db, remainingIds);
  });
  remove();
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

function applyScheduleItemOrder(
  db: ReturnType<typeof getDb>,
  dayId: string,
  itemIds: string[]
): void {
  const rows = db.prepare(
    `SELECT id, poi_id, from_edge_id
     FROM schedule_items
     WHERE day_id = ?`
  ).all(dayId) as Array<{ id: string; poi_id: string; from_edge_id: string | null }>;

  const existingIds = new Set(rows.map((row) => row.id));
  if (
    rows.length !== itemIds.length ||
    new Set(itemIds).size !== itemIds.length ||
    itemIds.some((id) => !existingIds.has(id))
  ) {
    throw new Error("日程项已发生变化，请刷新后重试");
  }

  const rowById = new Map(rows.map((row) => [row.id, row]));
  const edges = db.prepare(
    `SELECT id, origin_id, destination_id
     FROM edges
     ORDER BY created_at DESC`
  ).all() as Array<{ id: string; origin_id: string; destination_id: string }>;
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));

  const connects = (
    edge: { origin_id: string; destination_id: string },
    fromPoiId: string,
    toPoiId: string
  ) => (
    (edge.origin_id === fromPoiId && edge.destination_id === toPoiId) ||
    (edge.origin_id === toPoiId && edge.destination_id === fromPoiId)
  );

  const updateItem = db.prepare(
    `UPDATE schedule_items
     SET item_order = ?, from_edge_id = ?, updated_at = datetime('now')
     WHERE id = ? AND day_id = ?`
  );

  itemIds.forEach((id, index) => {
    let fromEdgeId: string | null = null;
    if (index > 0) {
      const previous = rowById.get(itemIds[index - 1]);
      const current = rowById.get(id);
      if (!previous || !current) throw new Error("日程项不存在");

      const preferred = rows
        .map((row) => row.from_edge_id ? edgeById.get(row.from_edge_id) : undefined)
        .find((edge) => edge && connects(edge, previous.poi_id, current.poi_id));
      const matching = preferred || edges.find((edge) =>
        connects(edge, previous.poi_id, current.poi_id)
      );
      fromEdgeId = matching?.id || null;
    }

    updateItem.run(index, fromEdgeId, id, dayId);
  });
}

/** Insert a schedule item at a zero-based position and repair adjacent routes atomically. */
export function insertScheduleItemAtPosition(item: ScheduleItem, requestedIndex: number): Day {
  const db = getDb();
  const insert = db.transaction(() => {
    const existingIds = (db.prepare(
      "SELECT id FROM schedule_items WHERE day_id = ? ORDER BY item_order, created_at"
    ).all(item.dayId) as Array<{ id: string }>).map((row) => row.id);
    const index = Math.max(0, Math.min(existingIds.length, Math.trunc(requestedIndex)));
    item.order = existingIds.length;
    insertScheduleItem(item);
    existingIds.splice(index, 0, item.id);
    applyScheduleItemOrder(db, item.dayId, existingIds);
  });
  insert();
  const day = getDayById(item.dayId);
  if (!day) throw new Error("日程不存在");
  return day;
}

/**
 * Persist a complete ordering for one day and repair every route reference so
 * that `from_edge_id` always describes the immediately preceding POI.
 * Existing edges are only referenced here; they are never modified or deleted.
 */
export function reorderScheduleItemsInDb(dayId: string, itemIds: string[]): Day {
  const db = getDb();
  const reorder = db.transaction(() => applyScheduleItemOrder(db, dayId, itemIds));

  reorder();
  const day = getDayById(dayId);
  if (!day) throw new Error("日程不存在");
  return day;
}

export function clearAllSchedule(): void {
  const db = getDb();
  db.prepare("DELETE FROM schedule_items").run();
  db.prepare("DELETE FROM days").run();
}

/**
 * Reverse the itinerary across all day slots without changing the schema or
 * deleting/recreating any persisted day or schedule item.
 *
 * Day metadata (date, label and notes) stays attached to its original day
 * slot. Only the itinerary items move. `from_edge_id` belongs to the leg that
 * precedes an item, so it has to be shifted as each day's item order reverses.
 */
export function reverseItineraryInDb(): Day[] {
  const db = getDb();

  const reverse = db.transaction(() => {
    const days = getAllDays();
    if (days.length === 0) return;

    const sourceItemsByDay = [...days]
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((day) => [...day.items].sort((a, b) => a.order - b.order));

    const updateItem = db.prepare(
      `UPDATE schedule_items
       SET day_id = ?, item_order = ?, from_edge_id = ?, updated_at = datetime('now')
       WHERE id = ?`
    );

    for (let targetIndex = 0; targetIndex < days.length; targetIndex += 1) {
      const targetDay = days[targetIndex];
      const sourceItems = sourceItemsByDay[days.length - 1 - targetIndex];
      const reversedItems = [...sourceItems].reverse();

      reversedItems.forEach((item, itemIndex) => {
        // In A→B→C, B stores AB and C stores BC. After reversing, B must
        // store BC and A must store AB, hence the edge comes from the item
        // immediately before it in the reversed array.
        const fromEdgeId = itemIndex === 0
          ? null
          : reversedItems[itemIndex - 1].fromEdgeId;
        updateItem.run(targetDay.id, itemIndex, fromEdgeId, item.id);
      });
    }
  });

  reverse();
  return getAllDays();
}
