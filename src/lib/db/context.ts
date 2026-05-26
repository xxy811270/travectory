// ========== Per-request user context ==========
import { AsyncLocalStorage } from "async_hooks";

interface RequestContext {
  userId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithUser<T>(userId: string, fn: () => T): T {
  return storage.run({ userId }, fn);
}

export function getCurrentUserId(): string {
  return storage.getStore()?.userId || "default";
}
