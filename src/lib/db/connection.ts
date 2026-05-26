import Database from "better-sqlite3";
import path from "path";
import { SCHEMA_SQL } from "./schema";
import { getCurrentUserId } from "./context";

const dbs = new Map<string, Database.Database>();

export function getDb(userId?: string): Database.Database {
  const uid = userId || getCurrentUserId();
  const existing = dbs.get(uid);
  if (existing) return existing;

  const dbPath = path.join(process.cwd(), "data", `travectory_${uid}.db`);

  const fs = require("fs");
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);

  const meta = db.prepare("SELECT id FROM project_meta WHERE id = 'default'").get();
  if (!meta) {
    db.prepare("INSERT INTO project_meta (id) VALUES ('default')").run();
  }

  dbs.set(uid, db);
  return db;
}

export function closeAllDbs(): void {
  dbs.forEach((db) => db.close());
  dbs.clear();
}
