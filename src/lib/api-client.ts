// ========== API Client for Client Components ==========

function getStoredUserId(): string {
  if (typeof window === "undefined") return "default";
  try {
    const stored = localStorage.getItem("travectory_user");
    if (stored) return JSON.parse(stored).id || "default";
  } catch { /* ignore */ }
  return "default";
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "x-user-id": getStoredUserId(),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// POI
export const poiApi = {
  list: () => apiFetch<import("@/types").POI[]>("/api/poi"),
  get: (id: string) => apiFetch<import("@/types").POI>(`/api/poi/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").POI>("/api/poi", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<import("@/types").POI>(`/api/poi/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/poi/${id}`, { method: "DELETE" }),
  search: (params: Record<string, unknown>) =>
    apiFetch<{ pois: import("@/types").AmapPOIResult[]; count?: string }>("/api/poi/search", { method: "POST", body: JSON.stringify(params) }),
  geocode: (params: Record<string, unknown>) =>
    apiFetch<{ lng: number; lat: number; formattedAddress?: string; address?: string; nearbyPois?: unknown[] } | null>(
      "/api/poi/geocode", { method: "POST", body: JSON.stringify(params) }
    ),
};

// Edge
export const edgeApi = {
  list: () => apiFetch<import("@/types").Edge[]>("/api/edge"),
  get: (id: string) => apiFetch<import("@/types").Edge>(`/api/edge/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").Edge>("/api/edge", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<import("@/types").Edge>(`/api/edge/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/edge/${id}`, { method: "DELETE" }),
};

// Route
export const routeApi = {
  calculate: (params: Record<string, unknown>) =>
    apiFetch<{ routes: import("@/types").RoutePath[] }>("/api/route/calculate", { method: "POST", body: JSON.stringify(params) }),
};

// Day
export const dayApi = {
  list: () => apiFetch<import("@/types").Day[]>("/api/day"),
  get: (id: string) => apiFetch<import("@/types").Day>(`/api/day/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").Day>("/api/day", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<import("@/types").Day>(`/api/day/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/day/${id}`, { method: "DELETE" }),
};

// Schedule
export const scheduleApi = {
  create: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").ScheduleItem>("/api/schedule", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<{ success: boolean }>(`/api/schedule/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/schedule/${id}`, { method: "DELETE" }),
};

// Project
export const projectApi = {
  get: () => apiFetch<import("@/types").ProjectMetadata>("/api/project"),
  update: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").ProjectMetadata>("/api/project", { method: "PUT", body: JSON.stringify(data) }),
};
