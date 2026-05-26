// ========== Polyline Utilities ==========
import { haversineDistance } from "./distance";

export function samplePointsAlongPolyline(
  polyline: [number, number][],
  numSamples: number
): [number, number][] {
  if (polyline.length <= numSamples) return [...polyline];

  const result: [number, number][] = [polyline[0]];
  const step = (polyline.length - 1) / (numSamples - 1);

  for (let i = 1; i < numSamples - 1; i++) {
    const idx = Math.round(i * step);
    result.push(polyline[idx]);
  }

  result.push(polyline[polyline.length - 1]);
  return result;
}

export function samplePointsByDistance(
  polyline: [number, number][],
  intervalMeters: number
): [number, number][] {
  if (polyline.length < 2) return [...polyline];

  const result: [number, number][] = [polyline[0]];
  let accumulated = 0;

  for (let i = 1; i < polyline.length; i++) {
    const d = haversineDistance(
      polyline[i - 1][0],
      polyline[i - 1][1],
      polyline[i][0],
      polyline[i][1]
    );
    accumulated += d;
    if (accumulated >= intervalMeters) {
      result.push(polyline[i]);
      accumulated = 0;
    }
  }

  if (result[result.length - 1] !== polyline[polyline.length - 1]) {
    result.push(polyline[polyline.length - 1]);
  }

  return result;
}

export function getPolylineBounds(
  polyline: [number, number][]
): { sw: [number, number]; ne: [number, number] } | null {
  if (!polyline.length) return null;

  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  for (const [lng, lat] of polyline) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return { sw: [minLng, minLat], ne: [maxLng, maxLat] };
}
