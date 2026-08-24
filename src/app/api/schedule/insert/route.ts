import { NextRequest, NextResponse } from "next/server";
import { insertScheduleItemAtPosition } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import { v4 as uuidv4 } from "uuid";

export const POST = withUser(async (req: NextRequest) => {
  try {
    const body = await req.json();
    if (
      typeof body.dayId !== "string" ||
      typeof body.poiId !== "string" ||
      !Number.isFinite(Number(body.insertAt))
    ) {
      return NextResponse.json({ error: "无效的 POI 插入数据" }, { status: 400 });
    }

    const item = {
      id: uuidv4(),
      dayId: body.dayId,
      poiId: body.poiId,
      order: 0,
      arrivalTime: body.arrivalTime || null,
      departureTime: body.departureTime || null,
      stayDuration: body.stayDuration || { hours: 0, minutes: 0 },
      fromEdgeId: body.fromEdgeId || null,
      notes: body.notes || "",
    };
    return NextResponse.json(
      insertScheduleItemAtPosition(item, Number(body.insertAt)),
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 409 });
  }
});
