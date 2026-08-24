import type { AmapPoiResult, Day, Edge, Poi, Project, ProjectListItem } from "../types";

async function get<T>(path: string, userId: string, projectId?: string): Promise<T> {
  const response = await fetch(`/backend${path}`, {
    cache: "no-store",
    headers: { "x-user-id": userId, "x-project-id": projectId || "default" },
  });
  if (!response.ok) throw new Error(`服务端返回 ${response.status}`);
  return response.json();
}

async function request<T>(path: string, userId: string, projectId: string, method: string, data?: unknown): Promise<T> {
  const response = await fetch(`/backend${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-user-id": userId, "x-project-id": projectId },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `请求失败（${response.status}）`);
  return body;
}

export function mobileRawRequest(path: string, userId: string, projectId: string, options?: { method?: string; data?: unknown }): Promise<Response> {
  return fetch(`/backend${path}`, {
    method: options?.method || "GET",
    headers: { "Content-Type": "application/json", "x-user-id": userId, "x-project-id": projectId },
    body: options?.data === undefined ? undefined : JSON.stringify(options.data),
  });
}

export async function loadProjects(): Promise<ProjectListItem[]> {
  const response = await fetch("/api/projects", { cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "读取路书列表失败");
  return body;
}

export async function loadMobileData(userId: string, projectId: string) {
  const [project, days, pois, edges] = await Promise.all([
    get<Project>("/api/project", userId, projectId),
    get<Day[]>("/api/day", userId, projectId),
    get<Poi[]>("/api/poi", userId, projectId),
    get<Edge[]>("/api/edge", userId, projectId),
  ]);
  return { project, days: [...days].sort((a, b) => a.dayNumber - b.dayNumber), pois, edges };
}

export const mobilePoiApi = {
  create: (userId: string, projectId: string, data: Record<string, unknown>) =>
    request<Poi>("/api/poi", userId, projectId, "POST", data),
  update: (userId: string, projectId: string, id: string, data: Record<string, unknown>) =>
    request<Poi>(`/api/poi/${id}`, userId, projectId, "PUT", data),
  delete: (userId: string, projectId: string, id: string) =>
    request<{ success: boolean }>(`/api/poi/${id}`, userId, projectId, "DELETE"),
  search: (userId: string, projectId: string, keywords: string) =>
    request<{ pois: AmapPoiResult[] }>("/api/poi/search", userId, projectId, "POST", { keywords }),
  geocode: (userId: string, projectId: string, address: string) =>
    request<{ lng: number; lat: number; formattedAddress?: string } | null>("/api/poi/geocode", userId, projectId, "POST", { address }),
};

export const mobileEdgeApi = {
  create: (userId: string, projectId: string, data: Record<string, unknown>) =>
    request<Edge>("/api/edge", userId, projectId, "POST", data),
  update: (userId: string, projectId: string, id: string, data: Record<string, unknown>) =>
    request<Edge>(`/api/edge/${id}`, userId, projectId, "PUT", data),
  delete: (userId: string, projectId: string, id: string) =>
    request<{ success: boolean }>(`/api/edge/${id}`, userId, projectId, "DELETE"),
};

export const mobileDayApi = {
  create: (userId: string, projectId: string, data: Record<string, unknown>) => request<Day>("/api/day", userId, projectId, "POST", data),
  update: (userId: string, projectId: string, id: string, data: Record<string, unknown>) => request<Day>(`/api/day/${id}`, userId, projectId, "PUT", data),
  delete: (userId: string, projectId: string, id: string) => request<{ success: boolean }>(`/api/day/${id}`, userId, projectId, "DELETE"),
  reorder: (userId: string, projectId: string, dayIds: string[]) => request<Day[]>("/api/day/reorder", userId, projectId, "POST", { dayIds }),
  reverse: (userId: string, projectId: string) => request<Day[]>("/api/day/reverse", userId, projectId, "POST"),
};

export const mobileScheduleApi = {
  insertAt: (userId: string, projectId: string, data: Record<string, unknown>) => request<Day>("/api/schedule/insert", userId, projectId, "POST", data),
  update: (userId: string, projectId: string, id: string, data: Record<string, unknown>) => request<{ success: boolean }>(`/api/schedule/${id}`, userId, projectId, "PUT", data),
  delete: (userId: string, projectId: string, id: string) => request<{ success: boolean }>(`/api/schedule/${id}`, userId, projectId, "DELETE"),
  reorder: (userId: string, projectId: string, dayId: string, itemIds: string[]) => request<Day>("/api/schedule/reorder", userId, projectId, "POST", { dayId, itemIds }),
};

export const mobileProjectApi = {
  rename: (userId: string, projectId: string, name: string) => request<{ success?: boolean }>(`/api/projects/${projectId}`, userId, projectId, "PUT", { name }),
  share: (userId: string, projectId: string) => request<{ id: string }>("/api/share", userId, projectId, "POST"),
  revokeShare: (userId: string, projectId: string, id: string) => request<{ success: boolean }>("/api/share", userId, projectId, "DELETE", { id }),
};
