import { NextRequest, NextResponse } from "next/server";
import { reorderDaysInDb } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";

export const POST = withUser(async (req: NextRequest) => {
  try {
    const body = await req.json();
    if (!Array.isArray(body.dayIds) || body.dayIds.some((id: unknown) => typeof id !== "string")) {
      return NextResponse.json({ error: "无效的日程顺序" }, { status: 400 });
    }
    return NextResponse.json(reorderDaysInDb(body.dayIds));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 409 });
  }
});
