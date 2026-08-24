// ========== User Authentication ==========
import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const USERS_DB_PATH = path.join(process.cwd(), "data", "travectory_users.db");

function getUsersDb(): Database.Database {
  const fs = require("fs");
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const db = new Database(USERS_DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '未命名路书',
      description TEXT DEFAULT '',
      poi_count INTEGER DEFAULT 0,
      edge_count INTEGER DEFAULT 0,
      day_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export function signup(username: string, password: string): User {
  const db = getUsersDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) throw new Error("用户名已存在");

  const id = uuidv4();
  db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)")
    .run(id, username, hashPassword(password));
  db.close();

  return { id, username, createdAt: new Date().toISOString() };
}

export function login(username: string, password: string): User {
  const db = getUsersDb();
  const row = db.prepare("SELECT id, username, password_hash, created_at FROM users WHERE username = ?")
    .get(username) as Record<string, unknown> | undefined;
  db.close();

  if (!row) throw new Error("用户不存在");
  if (row.password_hash !== hashPassword(password)) throw new Error("密码错误");

  return {
    id: row.id as string,
    username: row.username as string,
    createdAt: row.created_at as string,
  };
}

export function getUserDataDbPath(userId: string): string {
  return path.join(process.cwd(), "data", `travectory_${userId}.db`);
}

export function getProjectDbPath(projectId: string): string {
  return path.join(process.cwd(), "data", `travectory_p_${projectId}.db`);
}

// Project CRUD
export interface Project {
  id: string; userId: string; name: string; description: string;
  poiCount: number; edgeCount: number; dayCount: number;
  createdAt: string; updatedAt: string;
}

export function listProjects(userId: string): Project[] {
  const db = getUsersDb();
  const rows = db.prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as Record<string, unknown>[];
  db.close();
  return rows.map(r => ({
    id: r.id as string, userId: r.user_id as string, name: r.name as string,
    description: (r.description as string) || "",
    poiCount: (r.poi_count as number) || 0, edgeCount: (r.edge_count as number) || 0,
    dayCount: (r.day_count as number) || 0,
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  }));
}

export function getProjectById(projectId: string, userId?: string): Project | null {
  const db = getUsersDb();
  const row = (userId
    ? db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(projectId, userId)
    : db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId)
  ) as Record<string, unknown> | undefined;
  db.close();
  if (!row) return null;
  return {
    id: row.id as string, userId: row.user_id as string, name: row.name as string,
    description: (row.description as string) || "",
    poiCount: (row.poi_count as number) || 0, edgeCount: (row.edge_count as number) || 0,
    dayCount: (row.day_count as number) || 0,
    createdAt: row.created_at as string, updatedAt: row.updated_at as string,
  };
}

export function createProject(userId: string, name: string): Project {
  const db = getUsersDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)").run(id, userId, name, now, now);
  db.close();
  return { id, userId, name, description: "", poiCount: 0, edgeCount: 0, dayCount: 0, createdAt: now, updatedAt: now };
}

export function updateProjectStats(projectId: string, poiCount: number, edgeCount: number, dayCount: number): void {
  const db = getUsersDb();
  db.prepare("UPDATE projects SET poi_count=?, edge_count=?, day_count=?, updated_at=datetime('now') WHERE id=?").run(poiCount, edgeCount, dayCount, projectId);
  db.close();
}

export function deleteProject(projectId: string): void {
  const db = getUsersDb();
  db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
  db.close();
  // Also delete the project data file
  const fs = require("fs");
  const p = getProjectDbPath(projectId);
  try { fs.unlinkSync(p); } catch { /* ok */ }
  try { fs.unlinkSync(p + "-shm"); } catch { /* ok */ }
  try { fs.unlinkSync(p + "-wal"); } catch { /* ok */ }
}

export function renameProject(projectId: string, name: string): void {
  const db = getUsersDb();
  db.prepare("UPDATE projects SET name=?, updated_at=datetime('now') WHERE id=?").run(name, projectId);
  db.close();
}
