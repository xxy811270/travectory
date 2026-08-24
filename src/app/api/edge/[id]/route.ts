import { NextRequest, NextResponse } from "next/server";
import { getEdgeById, updateEdgeInDb, deleteEdgeFromDb, getAllPois, getAllEdges, getAllDays } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import { updateProjectStats } from "@/lib/db/auth";
import { getCurrentProjectId } from "@/lib/db/context";

function syncStats() {
  const pid = getCurrentProjectId();
  if (pid) updateProjectStats(pid, getAllPois().length, getAllEdges().length, getAllDays().length);
}

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
  syncStats();
  return NextResponse.json({ success: true });
});
