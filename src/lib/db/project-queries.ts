// ========== Project Metadata Database Queries ==========
import { getDb } from "./connection";
import type { ProjectMetadata, ShareLink } from "@/types";

export function getProjectMeta(): ProjectMetadata {
  const db = getDb();
  const row = db.prepare("SELECT * FROM project_meta WHERE id = 'default'").get() as Record<string, unknown>;
  return {
    name: (row.name as string) || "未命名路书",
    description: (row.description as string) || "",
    coverImage: (row.cover_image as string) || null,
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
  };
}

export function updateProjectMeta(updates: Partial<ProjectMetadata>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
  if (updates.description !== undefined) { fields.push("description = ?"); values.push(updates.description); }
  if (updates.coverImage !== undefined) { fields.push("cover_image = ?"); values.push(updates.coverImage); }

  fields.push("updated_at = datetime('now')");
  if (fields.length === 1) return;

  db.prepare(`UPDATE project_meta SET ${fields.join(", ")} WHERE id = 'default'`).run(...values);
}

export function createShareLink(id: string): ShareLink {
  const db = getDb();
  db.prepare(
    "INSERT INTO share_links (id) VALUES (?)"
  ).run(id);
  const row = db.prepare("SELECT * FROM share_links WHERE id = ?").get(id) as Record<string, unknown>;
  return {
    id: row.id as string,
    createdAt: (row.created_at as string) || "",
    expiresAt: (row.expires_at as string) || null,
    viewCount: (row.view_count as number) || 0,
    isActive: true,
  };
}

export function getShareLink(id: string): ShareLink | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM share_links WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as string,
    createdAt: (row.created_at as string) || "",
    expiresAt: (row.expires_at as string) || null,
    viewCount: (row.view_count as number) || 0,
    isActive: !!(row.is_active),
  };
}

export function incrementShareViewCount(id: string): void {
  const db = getDb();
  db.prepare("UPDATE share_links SET view_count = view_count + 1 WHERE id = ?").run(id);
}

export function deactivateShareLink(id: string): void {
  const db = getDb();
  db.prepare("UPDATE share_links SET is_active = 0 WHERE id = ?").run(id);
}
