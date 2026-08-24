import { NextRequest, NextResponse } from "next/server";
import { reorderScheduleItemsInDb } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";

export const POST = withUser(async (req: NextRequest) => {
  try {
    const body = await req.json();
    if (typeof body.dayId !== "string" || !Array.isArray(body.itemIds)) {
      return NextResponse.json({ error: "无效的日程排序数据" }, { status: 400 });
    }
    return NextResponse.json(reorderScheduleItemsInDb(body.dayId, body.itemIds));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 409 });
  }
});
