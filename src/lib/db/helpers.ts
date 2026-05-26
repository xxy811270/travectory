// ========== Request helpers ==========
import { NextRequest } from "next/server";
import Database from "better-sqlite3";
import { getDb } from "./connection";

export function getUserId(req: NextRequest): string {
  return req.headers.get("x-user-id") || "default";
}

export function getUserDb(req: NextRequest): Database.Database {
  return getDb(getUserId(req));
}
