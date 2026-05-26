import { NextRequest, NextResponse } from "next/server";
import { clearAllPois, clearAllEdges, clearAllSchedule, updateProjectMeta, getDb } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import type { RoadbookProject } from "@/types";

export const POST = withUser(async (req: NextRequest) => {
  try {
    const body = await req.json();
    if (!body.version || !body.pois || !body.edges || !body.days) {
      return NextResponse.json({ error: "Invalid .roadbook file format" }, { status: 400 });
    }
    const project = body as RoadbookProject;
    const db = getDb();
    clearAllSchedule(); clearAllEdges(); clearAllPois();
    updateProjectMeta(project.metadata);
    const insPoi = db.prepare("INSERT INTO pois (id, name, lng, lat, address, tag, amap_poi_id, phone, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    for (const p of project.pois) insPoi.run(p.id, p.name, p.lng, p.lat, p.address, p.tag, p.amapPoiId || null, p.phone, p.notes, p.createdAt, p.updatedAt);
    const insEdge = db.prepare("INSERT INTO edges (id, origin_id, destination_id, transport_mode, selected_route_index, driving_routes, cycling_routes, walking_routes, custom_route, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    for (const e of project.edges) insEdge.run(e.id, e.originId, e.destinationId, e.transportMode, e.selectedRouteIndex, JSON.stringify(e.drivingRoutes), JSON.stringify(e.cyclingRoutes), JSON.stringify(e.walkingRoutes), e.customRoute ? JSON.stringify(e.customRoute) : null, e.createdAt, e.updatedAt);
    const insDay = db.prepare("INSERT INTO days (id, project_id, day_number, date, label, accommodation_id, notes_content, notes_mentions, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
    const insItem = db.prepare("INSERT INTO schedule_items (id, day_id, poi_id, item_order, arrival_time, departure_time, stay_hours, stay_minutes, from_edge_id, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))");
    for (const d of project.days) {
      insDay.run(d.id, d.projectId, d.dayNumber, d.date, d.label, d.accommodationId, d.notesContent, JSON.stringify(d.notesMentions), d.createdAt, d.updatedAt);
      for (const it of d.items) insItem.run(it.id, it.dayId, it.poiId, it.order, it.arrivalTime, it.departureTime, it.stayDuration?.hours ?? 0, it.stayDuration?.minutes ?? 0, it.fromEdgeId, it.notes);
    }
    return NextResponse.json({ success: true, projectName: project.metadata.name, poiCount: project.pois.length, edgeCount: project.edges.length, dayCount: project.days.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
