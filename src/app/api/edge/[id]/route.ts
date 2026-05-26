import { NextRequest, NextResponse } from "next/server";
import { getEdgeById, updateEdgeInDb, deleteEdgeFromDb } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";

export const GET = withUser(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const edge = getEdgeById(id);
  if (!edge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(edge);
});

export const PUT = withUser(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const body = await req.json();
  updateEdgeInDb(id, body);
  return NextResponse.json(getEdgeById(id));
});

export const DELETE = withUser(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  deleteEdgeFromDb(id);
  return NextResponse.json({ success: true });
});
