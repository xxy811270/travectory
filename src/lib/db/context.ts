import { AsyncLocalStorage } from "async_hooks";

interface RequestContext {
  userId: string;
  projectId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithUser<T>(userId: string, fn: () => T): T {
  return storage.run({ userId, projectId: userId }, fn);
}

export function setCurrentProject(projectId: string): void {
  const ctx = storage.getStore();
  if (ctx) ctx.projectId = projectId;
}

export function getCurrentUserId(): string {
  return storage.getStore()?.userId || "default";
}

export function getCurrentProjectId(): string {
  return storage.getStore()?.projectId || storage.getStore()?.userId || "default";
}
