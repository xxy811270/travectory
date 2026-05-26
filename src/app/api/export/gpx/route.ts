import { NextRequest, NextResponse } from "next/server";
import { getDayById, getEdgeById, getPoiById } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";

function buildGpx(tracks: Array<{ name: string; points: [number, number][] }>): string {
  let body = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Travectory" xmlns="http://www.topografix.com/GPX/1/1">\n`;
  for (const t of tracks) {
    body += `  <trk>\n    <name>${t.name}</name>\n    <trkseg>\n`;
    for (const [lng, lat] of t.points) body += `      <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"></trkpt>\n`;
    body += "    </trkseg>\n  </trk>\n";
  }
  return body + "</gpx>";
}

export const POST = withUser(async (req: NextRequest) => {
  try {
    const { dayId } = await req.json();
    if (!dayId) return NextResponse.json({ error: "dayId required" }, { status: 400 });
    const day = getDayById(dayId);
    if (!day) return NextResponse.json({ error: "Day not found" }, { status: 404 });
    const tracks: Array<{ name: string; points: [number, number][] }> = [];
    const sorted = [...day.items].sort((a, b) => a.order - b.order);
    for (const item of sorted) {
      const poi = getPoiById(item.poiId);
      if (poi) tracks.push({ name: poi.name, points: [[poi.lng, poi.lat]] });
      if (item.fromEdgeId) {
        const edge = getEdgeById(item.fromEdgeId);
        if (edge) {
          const routes = edge.drivingRoutes.length ? edge.drivingRoutes : edge.cyclingRoutes.length ? edge.cyclingRoutes : edge.walkingRoutes.length ? edge.walkingRoutes : [];
          const r = routes[edge.selectedRouteIndex];
          if (r?.polyline.length) tracks.push({ name: "→", points: r.polyline });
        }
      }
    }
    const gpx = buildGpx(tracks);
    return new NextResponse(gpx, {
      headers: {
        "Content-Type": "application/gpx+xml",
        "Content-Disposition": `attachment; filename="day-${day.dayNumber}.gpx"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
