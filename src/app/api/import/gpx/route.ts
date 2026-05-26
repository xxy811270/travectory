import { NextRequest, NextResponse } from "next/server";
import { insertPoi, insertEdge } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import { v4 as uuidv4 } from "uuid";
import type { POI, Edge } from "@/types";

function parseGPX(xml: string): { pois: POI[]; edges: Edge[] } {
  const pois: POI[] = [], edges: Edge[] = [];
  const wptRegex = /<wpt[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"[^>]*>[\s\S]*?<name>([^<]*)<\/name>/g;
  let m;
  while ((m = wptRegex.exec(xml)) !== null) {
    const now = new Date().toISOString();
    pois.push({ id: uuidv4(), name: m[3].trim(), lng: parseFloat(m[2]), lat: parseFloat(m[1]), address: "", tag: "normal", phone: "", notes: "", createdAt: now, updatedAt: now });
  }
  const trkRegex = /<trk>[\s\S]*?<trkseg>([\s\S]*?)<\/trkseg>[\s\S]*?<\/trk>/g;
  let tm;
  while ((tm = trkRegex.exec(xml)) !== null) {
    const ptRegex = /<trkpt[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"[^>]*>/g;
    const points: [number, number][] = [];
    let pm;
    while ((pm = ptRegex.exec(tm[1])) !== null) points.push([parseFloat(pm[2]), parseFloat(pm[1])]);
    if (points.length >= 2) {
      // Create POIs for start and end if we have enough
      if (pois.length < 2) {
        const now = new Date().toISOString();
        pois.push({ id: uuidv4(), name: "Track Start", lng: points[0][0], lat: points[0][1], address: "", tag: "normal", phone: "", notes: "", createdAt: now, updatedAt: now });
        pois.push({ id: uuidv4(), name: "Track End", lng: points[points.length - 1][0], lat: points[points.length - 1][1], address: "", tag: "normal", phone: "", notes: "", createdAt: now, updatedAt: now });
      }
      const now = new Date().toISOString();
      edges.push({
        id: uuidv4(), originId: pois[pois.length - 2]?.id || pois[0]?.id || "",
        destinationId: pois[pois.length - 1]?.id || pois[1]?.id || "",
        transportMode: "driving",
        drivingRoutes: [{ distance: 0, duration: 0, tolls: 0, polyline: points, steps: [] }],
        cyclingRoutes: [], walkingRoutes: [], customRoute: null, selectedRouteIndex: 0,
        createdAt: now, updatedAt: now,
      });
    }
  }
  return { pois, edges };
}

export const POST = withUser(async (req: NextRequest) => {
  try {
    const ctype = req.headers.get("content-type") || "";
    let xml = "";
    if (ctype.includes("application/json")) { const b = await req.json(); xml = b.xml || b.gpx || ""; }
    else if (ctype.includes("multipart/form-data")) { const fd = await req.formData(); const f = fd.get("file") as File | null; if (f) xml = await f.text(); }
    else xml = await req.text();
    if (!xml.trim()) return NextResponse.json({ error: "No data" }, { status: 400 });
    const { pois, edges } = parseGPX(xml);
    for (const p of pois) insertPoi(p);
    for (const e of edges) insertEdge(e);
    return NextResponse.json({ pois, edges });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
