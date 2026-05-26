import { NextRequest, NextResponse } from "next/server";
import { getPoiById, updatePoiInDb, deletePoiFromDb, getDb } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";

export const GET = withUser(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const poi = getPoiById(id);
  if (!poi) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(poi);
});

export const PUT = withUser(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const body = await req.json();
  updatePoiInDb(id, body);
  return NextResponse.json(getPoiById(id));
});

export const DELETE = withUser(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  try {
    const db = getDb();
    db.prepare("DELETE FROM schedule_items WHERE poi_id = ?").run(id);
    db.prepare("DELETE FROM edges WHERE origin_id = ? OR destination_id = ?").run(id, id);
    db.prepare("UPDATE days SET accommodation_id = NULL WHERE accommodation_id = ?").run(id);
    deletePoiFromDb(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
