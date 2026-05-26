import { NextRequest, NextResponse } from "next/server";
import { getAllPois, insertPoi } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import { v4 as uuidv4 } from "uuid";

export const GET = withUser(async () => {
  try {
    const pois = getAllPois();
    return NextResponse.json(pois);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});

export const POST = withUser(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const poi = {
      id: uuidv4(), name: body.name, lng: body.lng, lat: body.lat,
      address: body.address || "", tag: body.tag || "normal",
      amapPoiId: body.amapPoiId || undefined,
      phone: body.phone || "", notes: body.notes || "",
      createdAt: now, updatedAt: now,
    };
    insertPoi(poi);
    return NextResponse.json(poi, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
