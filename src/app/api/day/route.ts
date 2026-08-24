import { NextRequest, NextResponse } from "next/server";
import { getAllDays, getAllPois, getAllEdges, insertDayAtPosition } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import { updateProjectStats } from "@/lib/db/auth";
import { getCurrentProjectId } from "@/lib/db/context";
import { v4 as uuidv4 } from "uuid";

function syncStats() {
  const pid = getCurrentProjectId();
  if (pid) updateProjectStats(pid, getAllPois().length, getAllEdges().length, getAllDays().length);
}

export const GET = withUser(async () => {
  try { return NextResponse.json(getAllDays()); }
  catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
});

export const POST = withUser(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const existing = getAllDays();
    const position = Number.isFinite(Number(body.insertAt))
      ? Math.max(1, Math.min(existing.length + 1, Math.trunc(Number(body.insertAt))))
      : existing.length + 1;
    const now = new Date().toISOString();
    const day = { id: uuidv4(), projectId: "default", dayNumber: position, date: body.date || null, label: body.label || null, accommodationId: body.accommodationId || null, items: [], notesContent: body.notesContent || "", notesMentions: body.notesMentions || [], createdAt: now, updatedAt: now };
    const created = insertDayAtPosition(day, position);
    syncStats();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
