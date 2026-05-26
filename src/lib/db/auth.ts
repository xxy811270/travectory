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
