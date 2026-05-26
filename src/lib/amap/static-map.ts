// ========== Amap Static Map URL Builder ==========
import { getWebKey } from "./client";

interface StaticMapOptions {
  width?: number;
  height?: number;
  zoom?: number;
  markers?: Array<{ lng: number; lat: number; label?: string; color?: string }>;
  paths?: Array<{ points: [number, number][]; color?: string; weight?: number }>;
}

export function buildStaticMapUrl(options: StaticMapOptions): string {
  const key = getWebKey();
  const w = options.width || 800;
  const h = options.height || 500;
  const zoom = options.zoom || 10;

  let url = `https://restapi.amap.com/v3/staticmap?key=${key}&size=${w}*${h}&scale=2`;

  // Markers
  if (options.markers && options.markers.length > 0) {
    const markerParams = options.markers.map((m) => {
      const color = m.color || "red";
      const label = m.label || "0";
      return `${m.lng},${m.lat},${color},${label}`;
    });
    url += "&markers=" + markerParams.join("|");
  }

  // Paths (routes)
  if (options.paths && options.paths.length > 0) {
    let pathIdx = 0;
    for (const p of options.paths) {
      if (p.points.length < 2) continue;
      // Sample to avoid URL length overflow (max ~60 points per path)
      const sampled = samplePoints(p.points, 60);
      const color = (p.color || "3366FF").replace("#", "");
      const weight = p.weight || 3;
      const pathStr = sampled.map((pt) => `${pt[0]},${pt[1]}`).join(";");
      url += `&paths=${weight},0x${color},1,,${pathStr}`;
      pathIdx++;
    }
  }

  return url;
}

function samplePoints(points: [number, number][], max: number): [number, number][] {
  if (points.length <= max) return points;
  const result: [number, number][] = [];
  const step = (points.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}
