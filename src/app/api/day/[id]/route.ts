import { NextRequest, NextResponse } from "next/server";
import { getDayById, updateDayInDb, deleteDayFromDb } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";

export const GET = withUser(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const day = getDayById(id);
  if (!day) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(day);
});

export const PUT = withUser(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  updateDayInDb(id, await req.json());
  return NextResponse.json(getDayById(id));
});

export const DELETE = withUser(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  deleteDayFromDb(id);
  return NextResponse.json({ success: true });
});
