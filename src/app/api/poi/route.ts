import { NextRequest, NextResponse } from "next/server";
import { getAllPois, getAllEdges, getAllDays, insertPoi } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import { updateProjectStats } from "@/lib/db/auth";
import { getCurrentProjectId } from "@/lib/db/context";
import { v4 as uuidv4 } from "uuid";

function syncStats() {
  const pid = getCurrentProjectId();
  if (pid) updateProjectStats(pid, getAllPois().length, getAllEdges().length, getAllDays().length);
}

export const GET = withUser(async () => {
  try { return NextResponse.json(getAllPois()); }
  catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
});

export const POST = withUser(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const poi = { id: uuidv4(), name: body.name, lng: body.lng, lat: body.lat, address: body.address||"", tag: body.tag||"normal", amapPoiId: body.amapPoiId, phone: body.phone||"", notes: body.notes||"", createdAt: now, updatedAt: now };
    insertPoi(poi);
    syncStats();
    return NextResponse.json(poi, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
