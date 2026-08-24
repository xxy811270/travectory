import { NextRequest, NextResponse } from "next/server";
import { getAllEdges, getAllPois, getAllDays, insertEdge } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import { updateProjectStats } from "@/lib/db/auth";
import { getCurrentProjectId } from "@/lib/db/context";
import { v4 as uuidv4 } from "uuid";

function syncStats() {
  const pid = getCurrentProjectId();
  if (pid) updateProjectStats(pid, getAllPois().length, getAllEdges().length, getAllDays().length);
}

export const GET = withUser(async () => {
  try { return NextResponse.json(getAllEdges()); }
  catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
});

export const POST = withUser(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const edge = { id: uuidv4(), originId: body.originId, destinationId: body.destinationId, transportMode: body.transportMode || "driving", drivingRoutes: body.drivingRoutes || [], cyclingRoutes: body.cyclingRoutes || [], walkingRoutes: body.walkingRoutes || [], customRoute: body.customRoute || null, selectedRouteIndex: body.selectedRouteIndex || 0, createdAt: now, updatedAt: now };
    insertEdge(edge);
    syncStats();
    return NextResponse.json(edge, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
