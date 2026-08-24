import sharp from "sharp";
import { formatDistance, formatDuration } from "@/lib/geo";
import { getWebKey } from "@/lib/amap/client";
import { TRANSPORT_LABELS } from "@/types";
import type { Day, Edge, POI, ProjectMetadata } from "@/types";

const WIDTH = 1080;
const SIDE = 48;
const DAY_COLORS = ["#2563eb", "#f97316", "#10b981", "#8b5cf6", "#e11d48", "#0891b2"];
const MAP_WIDTH = 936;
const MAP_HEIGHT = 520;

interface MapSegment {
  dayIndex: number;
  points: [number, number][];
}

interface MapMarker {
  dayIndex: number;
  itemIndex: number;
  point: [number, number];
}

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(value: string, max: number): string {
  const chars = Array.from(value.trim());
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : chars.join("");
}

function edgeMetrics(edge: Edge): { distance: number; duration: number; tolls: number } {
  const routes = edge.drivingRoutes.length
    ? edge.drivingRoutes
    : edge.cyclingRoutes.length
      ? edge.cyclingRoutes
      : edge.walkingRoutes;
  const route = routes[edge.selectedRouteIndex] || routes[0];
  return {
    distance: route?.distance || edge.customRoute?.distance || 0,
    duration: route?.duration || edge.customRoute?.duration || 0,
    tolls: route?.tolls || 0,
  };
}

function text(x: number, y: number, value: string, size: number, color: string, weight = 400): string {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${xml(value)}</text>`;
}

function mercatorPoint(lng: number, lat: number, zoom: number): [number, number] {
  const worldSize = 256 * 2 ** zoom;
  const limitedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin(limitedLat * Math.PI / 180);
  return [
    ((lng + 180) / 360) * worldSize,
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize,
  ];
}

function inverseMercator(x: number, y: number): [number, number] {
  const lng = x / 256 * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / 256;
  const lat = 180 / Math.PI * Math.atan(Math.sinh(n));
  return [lng, lat];
}

async function renderOverviewMap(
  days: Day[],
  pois: POI[],
  edges: Edge[]
): Promise<string> {
  const poiById = new Map(pois.map((poi) => [poi.id, poi]));
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const segments: MapSegment[] = [];
  const markers: MapMarker[] = [];

  days.forEach((day, dayIndex) => {
    const items = [...day.items].sort((a, b) => a.order - b.order);
    items.forEach((item, itemIndex) => {
      const poi = poiById.get(item.poiId);
      if (poi) markers.push({ dayIndex, itemIndex, point: [poi.lng, poi.lat] });
      if (itemIndex === 0) return;

      const previousPoi = poiById.get(items[itemIndex - 1].poiId);
      const edge = item.fromEdgeId ? edgeById.get(item.fromEdgeId) : undefined;
      const routes = edge
        ? edge.drivingRoutes.length
          ? edge.drivingRoutes
          : edge.cyclingRoutes.length
            ? edge.cyclingRoutes
            : edge.walkingRoutes
        : [];
      const route = edge ? routes[edge.selectedRouteIndex] || routes[0] : undefined;
      const routePoints = route?.polyline || edge?.customRoute?.polyline || [];
      if (routePoints.length >= 2) {
        segments.push({ dayIndex, points: routePoints });
      } else if (previousPoi && poi) {
        segments.push({ dayIndex, points: [[previousPoi.lng, previousPoi.lat], [poi.lng, poi.lat]] });
      }
    });
  });

  const allPoints = [
    ...segments.flatMap((segment) => segment.points),
    ...markers.map((marker) => marker.point),
  ];
  if (allPoints.length === 0) {
    return [
      `<rect x="72" y="500" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="16" fill="#eef2f7"/>`,
      text(410, 770, "暂无可展示的地图路线", 24, "#94a3b8", 600),
    ].join("");
  }

  const atZero = allPoints.map(([lng, lat]) => mercatorPoint(lng, lat, 0));
  const minX = Math.min(...atZero.map((point) => point[0]));
  const maxX = Math.max(...atZero.map((point) => point[0]));
  const minY = Math.min(...atZero.map((point) => point[1]));
  const maxY = Math.max(...atZero.map((point) => point[1]));
  const centerAtZero: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2];
  const [centerLng, centerLat] = inverseMercator(centerAtZero[0], centerAtZero[1]);
  const scaleX = (MAP_WIDTH - 56) / Math.max(maxX - minX, 0.000001);
  const scaleY = (MAP_HEIGHT - 56) / Math.max(maxY - minY, 0.000001);
  const zoom = Math.max(1, Math.min(17, Math.floor(Math.log2(Math.min(scaleX, scaleY)))));
  const center = mercatorPoint(centerLng, centerLat, zoom);
  const routeWidth = maxX - minX;
  const routeHeight = maxY - minY;
  const projectedWidth = Math.max(routeWidth * 2 ** zoom, 1);
  const projectedHeight = Math.max(routeHeight * 2 ** zoom, 1);
  // Static-map zoom levels are integers and can otherwise leave nearly half
  // the map unused. Scale and center-crop the selected level so the complete
  // route fits with a small, consistent margin.
  const visualScale = routeWidth < 0.000001 && routeHeight < 0.000001
    ? 1
    : Math.max(1, Math.min(
        (MAP_WIDTH - 56) / projectedWidth,
        (MAP_HEIGHT - 56) / projectedHeight
      ));
  // Render one conservative integer zoom level first, then crop using the
  // route pixels returned by AMap. This prevents clipping before fitting.
  const staticMapZoom = Math.max(1, zoom - 1);

  const distanceSquared = (a: [number, number], b: [number, number]) =>
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const samplePath = (points: [number, number][], maxPoints: number) => {
    if (points.length <= maxPoints) return points;
    const sampled: [number, number][] = [];
    const step = (points.length - 1) / (maxPoints - 1);
    for (let index = 0; index < maxPoints; index += 1) {
      sampled.push(points[Math.round(index * step)]);
    }
    return sampled;
  };
  const dayPaths = days.map((_day, dayIndex) => {
    const result: [number, number][] = [];
    const daySegments = segments.filter((segment) => segment.dayIndex === dayIndex);
    let target = markers.find((marker) => marker.dayIndex === dayIndex && marker.itemIndex === 0)?.point;
    daySegments.forEach((segment) => {
      let points = [...segment.points];
      if (target && distanceSquared(points[points.length - 1], target) < distanceSquared(points[0], target)) {
        points = points.reverse();
      }
      if (result.length > 0 && distanceSquared(result[result.length - 1], points[0]) < 0.00000001) {
        points = points.slice(1);
      }
      result.push(...points);
      target = result[result.length - 1];
    });
    return samplePath(result, 60);
  });

  let background = `<rect x="72" y="500" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="16" fill="#e8edf3"/>`;
  let officialRoutesRendered = false;
  try {
    const startLabels = markers
      .filter((marker) => marker.itemIndex === 0)
      .slice(0, 10)
      .map((marker) => {
        const color = DAY_COLORS[marker.dayIndex % DAY_COLORS.length].replace("#", "");
        return `D${marker.dayIndex + 1},0,1,14,0xFFFFFF,0x${color}:${marker.point[0]},${marker.point[1]}`;
      })
      .join("|");
    const fetchStaticMap = async (pathGroups: Array<{ dayIndex: number; points: [number, number][] }> = []) => {
      const url = new URL("https://restapi.amap.com/v3/staticmap");
      url.searchParams.set("key", getWebKey());
      url.searchParams.set("location", `${centerLng.toFixed(6)},${centerLat.toFixed(6)}`);
      url.searchParams.set("zoom", String(staticMapZoom));
      url.searchParams.set("size", `${MAP_WIDTH}*${MAP_HEIGHT}`);
      url.searchParams.set("scale", "1");
      if (startLabels) url.searchParams.set("labels", startLabels);
      if (pathGroups.length > 0) {
        const pathValue = pathGroups.map(({ dayIndex, points }) => {
          const color = DAY_COLORS[dayIndex % DAY_COLORS.length].replace("#", "");
          const coordinates = points.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(";");
          return `8,0x${color},0.9,,:${coordinates}`;
        }).join("|");
        url.searchParams.set("paths", pathValue);
      }
      const response = await fetch(url, { cache: "no-store" });
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.startsWith("image/")) throw new Error("静态地图请求失败");
      return Buffer.from(await response.arrayBuffer());
    };

    const baseMap = await fetchStaticMap();
    const routeGroups = dayPaths
      .map((points, dayIndex) => ({ dayIndex, points }))
      .filter((group) => group.points.length >= 2);
    let composedMap: Buffer<ArrayBufferLike> = baseMap;
    if (routeGroups.length > 0) {
      const baseRaw = await sharp(baseMap).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const composedPixels = Buffer.from(baseRaw.data);
      let routeMinX = baseRaw.info.width;
      let routeMaxX = -1;
      let routeMinY = baseRaw.info.height;
      let routeMaxY = -1;
      for (let batchStart = 0; batchStart < routeGroups.length; batchStart += 4) {
        const routeMap = await fetchStaticMap(routeGroups.slice(batchStart, batchStart + 4));
        const routeRaw = await sharp(routeMap).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        if (routeRaw.info.width !== baseRaw.info.width || routeRaw.info.height !== baseRaw.info.height) {
          throw new Error("静态地图尺寸不一致");
        }
        for (let offset = 0; offset < composedPixels.length; offset += 4) {
          const difference =
            Math.abs(routeRaw.data[offset] - baseRaw.data[offset]) +
            Math.abs(routeRaw.data[offset + 1] - baseRaw.data[offset + 1]) +
            Math.abs(routeRaw.data[offset + 2] - baseRaw.data[offset + 2]);
          if (difference > 12) {
            const pixelIndex = offset / 4;
            const pixelX = pixelIndex % baseRaw.info.width;
            const pixelY = Math.floor(pixelIndex / baseRaw.info.width);
            routeMinX = Math.min(routeMinX, pixelX);
            routeMaxX = Math.max(routeMaxX, pixelX);
            routeMinY = Math.min(routeMinY, pixelY);
            routeMaxY = Math.max(routeMaxY, pixelY);
            composedPixels[offset] = routeRaw.data[offset];
            composedPixels[offset + 1] = routeRaw.data[offset + 1];
            composedPixels[offset + 2] = routeRaw.data[offset + 2];
            composedPixels[offset + 3] = 255;
          }
        }
      }
      composedMap = await sharp(composedPixels, {
        raw: {
          width: baseRaw.info.width,
          height: baseRaw.info.height,
          channels: 4,
        },
      }).png().toBuffer();

      // Fit the crop from the pixels actually rendered by AMap rather than
      // from an independently calculated projection. This guarantees that
      // the complete route remains visible with about 28 px on each side.
      if (routeMaxX >= routeMinX && routeMaxY >= routeMinY) {
        const routePixelWidth = routeMaxX - routeMinX + 1;
        const routePixelHeight = routeMaxY - routeMinY + 1;
        const targetScale = Math.min(
          (MAP_WIDTH - 56) / routePixelWidth,
          (MAP_HEIGHT - 56) / routePixelHeight
        );
        if (targetScale > 1) {
          const cropWidth = Math.min(MAP_WIDTH, Math.max(1, Math.round(MAP_WIDTH / targetScale)));
          const cropHeight = Math.min(MAP_HEIGHT, Math.max(1, Math.round(MAP_HEIGHT / targetScale)));
          const routeCenterX = (routeMinX + routeMaxX) / 2;
          const routeCenterY = (routeMinY + routeMaxY) / 2;
          const cropLeft = Math.max(0, Math.min(MAP_WIDTH - cropWidth, Math.round(routeCenterX - cropWidth / 2)));
          const cropTop = Math.max(0, Math.min(MAP_HEIGHT - cropHeight, Math.round(routeCenterY - cropHeight / 2)));
          composedMap = await sharp(composedMap)
            .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
            .resize(MAP_WIDTH, MAP_HEIGHT)
            .png()
            .toBuffer();
        }
      }
      officialRoutesRendered = true;
    }
    const mapBase64 = composedMap.toString("base64");
    background = `<image x="72" y="500" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" href="data:image/png;base64,${mapBase64}" preserveAspectRatio="none" clip-path="url(#map-clip)"/>`;
  } catch {
    // Route geometry remains visible on a neutral background if the map
    // service is temporarily unavailable.
  }

  const toImagePoint = ([lng, lat]: [number, number]): [number, number] => {
    const projected = mercatorPoint(lng, lat, zoom);
    return [
      72 + MAP_WIDTH / 2 + (projected[0] - center[0]) * visualScale,
      500 + MAP_HEIGHT / 2 + (projected[1] - center[1]) * visualScale,
    ];
  };

  const overlay: string[] = [
    `<defs><clipPath id="map-clip"><rect x="72" y="500" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="16"/></clipPath></defs>`,
    background,
  ];
  if (!officialRoutesRendered) segments.forEach((segment) => {
      const points = segment.points.map(toImagePoint).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
      const color = DAY_COLORS[segment.dayIndex % DAY_COLORS.length];
      overlay.push(
        `<polyline points="${points}" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>`,
        `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`,
      );
    });
  if (!officialRoutesRendered) markers.forEach((marker) => {
    const [x, y] = toImagePoint(marker.point);
    const color = DAY_COLORS[marker.dayIndex % DAY_COLORS.length];
    if (marker.itemIndex === 0) {
      overlay.push(
        `<circle cx="${x}" cy="${y}" r="16" fill="#ffffff" stroke="${color}" stroke-width="5"/>`,
        text(x - 9, y + 6, `D${marker.dayIndex + 1}`, 13, color, 700),
      );
    } else {
      overlay.push(`<circle cx="${x}" cy="${y}" r="7" fill="${color}" stroke="#ffffff" stroke-width="3"/>`);
    }
    });

  return overlay.join("");
}

export async function renderRoadbookLongImage(
  meta: ProjectMetadata,
  pois: POI[],
  edges: Edge[],
  days: Day[]
): Promise<Buffer> {
  const poiById = new Map(pois.map((poi) => [poi.id, poi]));
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  const overviewMap = await renderOverviewMap(sortedDays, pois, edges);

  const dayHeights = sortedDays.map((day) => {
    const count = Math.max(day.items.length, 1);
    return 112 + count * 100 + 32;
  });
  const contentHeight = dayHeights.reduce((sum, height) => sum + height + 28, 0);
  const height = Math.max(1578, 1108 + contentHeight + 100);

  let totalDistance = 0;
  let totalDuration = 0;
  sortedDays.forEach((day) => day.items.forEach((item) => {
    if (!item.fromEdgeId) return;
    const edge = edgeById.get(item.fromEdgeId);
    if (!edge) return;
    const metrics = edgeMetrics(edge);
    totalDistance += metrics.distance;
    totalDuration += metrics.duration;
  }));

  const date = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric",
  }).format(new Date());

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">`,
    `<rect width="${WIDTH}" height="${height}" fill="#f3f6fb"/>`,
    `<rect width="${WIDTH}" height="300" fill="#3157d5"/>`,
    `<circle cx="930" cy="40" r="210" fill="#ffffff" opacity="0.07"/>`,
    `<circle cx="90" cy="290" r="150" fill="#ffffff" opacity="0.05"/>`,
    text(SIDE, 76, "TRAVECTORY 旅行路书", 24, "#dbeafe", 600),
    text(SIDE, 145, truncate(meta.name || "未命名路书", 24), 52, "#ffffff", 700),
    text(SIDE, 194, truncate(meta.description || "把远方，安排成清晰的每一天", 42), 24, "#dbeafe"),
    text(SIDE, 256, `${sortedDays.length} 天行程`, 27, "#ffffff", 600),
    text(255, 256, `${pois.length} 个地点`, 27, "#ffffff", 600),
    text(465, 256, date, 24, "#dbeafe"),
    `<rect x="${SIDE}" y="326" width="${WIDTH - SIDE * 2}" height="82" rx="20" fill="#ffffff"/>`,
    text(82, 360, "路线总览", 18, "#64748b", 600),
    text(82, 390, `总里程 ${formatDistance(totalDistance)}`, 24, "#0f172a", 700),
    text(415, 390, `交通耗时 ${formatDuration(totalDuration)}`, 24, "#0f172a", 700),
    text(815, 390, `${edges.length} 条路线`, 24, "#0f172a", 700),
    `<rect x="${SIDE}" y="436" width="${WIDTH - SIDE * 2}" height="650" rx="24" fill="#ffffff"/>`,
    text(76, 480, "按日程路线总览", 27, "#0f172a", 700),
    text(805, 478, "每日路线以不同颜色标识", 17, "#64748b"),
    overviewMap,
  ];

  let dayY = 1114;
  sortedDays.forEach((day, dayIndex) => {
    const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
    const items = [...day.items].sort((a, b) => a.order - b.order);
    const cardHeight = dayHeights[dayIndex];
    let dayDistance = 0;
    let dayDuration = 0;
    let dayTolls = 0;
    items.forEach((item) => {
      if (!item.fromEdgeId) return;
      const edge = edgeById.get(item.fromEdgeId);
      if (!edge) return;
      const metrics = edgeMetrics(edge);
      dayDistance += metrics.distance;
      dayDuration += metrics.duration;
      dayTolls += metrics.tolls;
    });
    const tollText = Number.isInteger(dayTolls) ? String(dayTolls) : dayTolls.toFixed(1);
    parts.push(
      `<rect x="${SIDE}" y="${dayY}" width="${WIDTH - SIDE * 2}" height="${cardHeight}" rx="24" fill="#ffffff"/>`,
      `<rect x="${SIDE}" y="${dayY}" width="10" height="${cardHeight}" rx="5" fill="${color}"/>`,
      text(82, dayY + 48, `DAY ${day.dayNumber}`, 20, color, 700),
      text(200, dayY + 49, truncate(exportDayLabel(day), 28), 30, "#0f172a", 700),
      text(82, dayY + 84, day.date || `${items.length} 个行程地点`, 19, "#64748b"),
      `<rect x="468" y="${dayY + 61}" width="532" height="40" rx="12" fill="#f5f7fb"/>`,
      text(486, dayY + 87, `行驶里程 ${formatDistance(dayDistance)}`, 17, "#475569", 600),
      text(674, dayY + 87, `行驶时长 ${formatDuration(dayDuration)}`, 17, "#475569", 600),
      text(884, dayY + 87, `总过路费 ¥${tollText}`, 17, "#475569", 600),
    );

    if (items.length === 0) {
      parts.push(text(82, dayY + 148, "当天尚未安排行程", 23, "#94a3b8"));
    }

    items.forEach((item, itemIndex) => {
      const poi = poiById.get(item.poiId);
      const rowY = dayY + 112 + itemIndex * 100;
      if (itemIndex < items.length - 1) {
        parts.push(`<line x1="108" y1="${rowY + 36}" x2="108" y2="${rowY + 106}" stroke="${color}" stroke-width="4" stroke-dasharray="6 7" opacity="0.45"/>`);
      }
      parts.push(
        `<circle cx="108" cy="${rowY + 28}" r="25" fill="${color}"/>`,
        text(100, rowY + 37, String(itemIndex + 1), 22, "#ffffff", 700),
        text(154, rowY + 25, truncate(poi?.name || "未命名地点", 30), 27, "#172033", 700),
        text(154, rowY + 57, truncate(poi?.address || "", 48), 18, "#64748b"),
      );

      if (itemIndex > 0 && item.fromEdgeId) {
        const edge = edgeById.get(item.fromEdgeId);
        if (edge) {
          const metrics = edgeMetrics(edge);
          const mode = TRANSPORT_LABELS[edge.transportMode] || edge.transportMode;
          parts.push(text(
            690,
            rowY + 35,
            `${mode} · ${formatDistance(metrics.distance)} · ${formatDuration(metrics.duration)}`,
            18,
            color,
            600
          ));
        }
      }
    });

    dayY += cardHeight + 28;
  });

  parts.push(
    text(SIDE, height - 46, `由 Travectory 生成 · ${date}`, 18, "#94a3b8"),
    text(WIDTH - 270, height - 46, "愿每一程都有好风景", 18, "#94a3b8"),
    "</svg>",
  );

  return sharp(Buffer.from(parts.join("")), { limitInputPixels: false })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

/**
 * Labels automatically created for a day contain the position that was valid
 * at creation time. After inserting or moving days that stored label may be
 * stale (for example two rows can both still say “第二天”). For PNG display,
 * regenerate only those generic labels from the current persisted dayNumber;
 * user-authored descriptive labels remain untouched.
 */
function exportDayLabel(day: Day): string {
  const label = day.label?.trim() || "";
  const isGeneratedLabel = !label ||
    /^day\s*\d+$/i.test(label) ||
    /^第\s*(?:\d+|[零〇一二两三四五六七八九十百千万]+)\s*天$/.test(label);
  return isGeneratedLabel ? `第${toChineseNumber(day.dayNumber)}天` : label;
}

function toChineseNumber(value: number): string {
  const number = Math.max(0, Math.trunc(value));
  if (number === 0) return "零";
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const units = ["", "十", "百", "千"];
  if (number >= 10000) return String(number);

  const chars: string[] = [];
  let pendingZero = false;
  for (let position = 3; position >= 0; position -= 1) {
    const divisor = 10 ** position;
    const digit = Math.floor(number / divisor) % 10;
    if (digit === 0) {
      if (chars.length > 0) pendingZero = true;
      continue;
    }
    if (pendingZero) chars.push("零");
    if (!(digit === 1 && position === 1 && chars.length === 0)) chars.push(digits[digit]);
    chars.push(units[position]);
    pendingZero = false;
  }
  return chars.join("");
}
