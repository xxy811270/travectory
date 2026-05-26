import { NextRequest, NextResponse } from "next/server";
import { insertScheduleItem } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import { v4 as uuidv4 } from "uuid";

export const POST = withUser(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const item = {
      id: uuidv4(), dayId: body.dayId, poiId: body.poiId,
      order: body.order || 0, arrivalTime: body.arrivalTime || null,
      departureTime: body.departureTime || null,
      stayDuration: body.stayDuration || { hours: 0, minutes: 0 },
      fromEdgeId: body.fromEdgeId || null, notes: body.notes || "",
    };
    insertScheduleItem(item);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
