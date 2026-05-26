import { NextRequest, NextResponse } from "next/server";
import { updateScheduleItemInDb, deleteScheduleItemFromDb } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";

export const PUT = withUser(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  updateScheduleItemInDb(id, await req.json());
  return NextResponse.json({ success: true });
});

export const DELETE = withUser(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  deleteScheduleItemFromDb(id);
  return NextResponse.json({ success: true });
});
