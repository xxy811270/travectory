// ========== Along-Route Search ==========
import { samplePointsByDistance } from "./polyline";
import { searchAround } from "@/lib/amap/search";
import type { AmapPOIResult } from "@/types";

export async function searchAlongRoute(
  polyline: [number, number][],
  keywords: string,
  radiusMeters: number = 3000,
  sampleInterval: number = 5000
): Promise<AmapPOIResult[]> {
  const samplePoints = samplePointsByDistance(polyline, sampleInterval);
  const seen = new Set<string>();
  const results: AmapPOIResult[] = [];

  for (const [lng, lat] of samplePoints) {
    try {
      const pois = await searchAround(lng, lat, keywords, undefined, radiusMeters);
      for (const poi of pois) {
        if (!seen.has(poi.id)) {
          seen.add(poi.id);
          results.push(poi);
        }
      }
    } catch {
      // Skip failed sample points
    }
  }

  return results;
}
