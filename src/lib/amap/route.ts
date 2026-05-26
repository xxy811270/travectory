// ========== Amap Route Planning ==========
import { amapGet } from "./client";
import type { RoutePath } from "@/types";

function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  return encoded.split(";").map((pair) => {
    const [lng, lat] = pair.split(",").map(Number);
    return [lng, lat] as [number, number];
  });
}

// Generic path parser that works with both v3 and v4 API formats
function parsePath(path: Record<string, unknown>): RoutePath {
  const rawSteps = (path.steps || []) as Record<string, unknown>[];
  const steps = rawSteps.map((step) => ({
    instruction: (step.instruction as string) || "",
    polyline: decodePolyline((step.polyline as string) || ""),
    distance: Number(step.distance) || 0,
    duration: Number(step.duration) || 0,
    road: (step.road as string) || undefined,
  }));

  // Build full route polyline by concatenating all step polylines
  const fullPolyline: [number, number][] = [];
  for (const step of steps) {
    if (step.polyline.length > 0) {
      fullPolyline.push(...step.polyline);
    }
  }

  return {
    distance: Number(path.distance) || 0,
    duration: Number(path.duration) || 0,
    tolls: Number(path.tolls) || 0,
    tollDistance: path.toll_distance ? Number(path.toll_distance) : undefined,
    trafficLights: path.traffic_lights ? Number(path.traffic_lights) : undefined,
    strategy: (path.strategy as string) || undefined,
    polyline: fullPolyline,
    steps,
  };
}

export async function calculateDrivingRoute(
  origin: string,
  destination: string,
  strategy?: string,
  waypoints?: string
): Promise<RoutePath[]> {
  const data = await amapGet<Record<string, unknown>>("/v3/direction/driving", {
    origin,
    destination,
    strategy: strategy || "0",
    waypoints,
    extensions: "all",
    show_fields: "polyline",
  });

  if (data.status !== "1") {
    throw new Error(`Driving route calculation failed: ${data.info || "unknown"}`);
  }

  const route = data.route as Record<string, unknown> | undefined;
  const paths = (route?.paths || []) as Record<string, unknown>[];
  return paths.map(parsePath);
}

export async function calculateCyclingRoute(
  origin: string,
  destination: string
): Promise<RoutePath[]> {
  const data = await amapGet<Record<string, unknown>>("/v4/direction/bicycling", {
    origin,
    destination,
    show_fields: "polyline",
  });

  // v4 API has different format: { data: { paths: [...] }, errcode: 0 }
  if (data.errcode !== 0 && data.errcode !== undefined) {
    throw new Error(`Cycling route calculation failed: ${data.errdetail || "unknown"}`);
  }

  const d = (data.data || data) as Record<string, unknown>;
  const paths = (d.paths || []) as Record<string, unknown>[];
  return paths.map(parsePath);
}

export async function calculateWalkingRoute(
  origin: string,
  destination: string
): Promise<RoutePath[]> {
  const data = await amapGet<Record<string, unknown>>("/v3/direction/walking", {
    origin,
    destination,
    show_fields: "polyline",
  });

  if (data.status !== "1") {
    throw new Error(`Walking route calculation failed: ${data.info || "unknown"}`);
  }

  const route = data.route as Record<string, unknown> | undefined;
  const paths = (route?.paths || []) as Record<string, unknown>[];
  return paths.map(parsePath);
}
