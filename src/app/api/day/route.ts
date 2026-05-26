import { NextRequest, NextResponse } from "next/server";
import { getAllDays, insertDay } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import { v4 as uuidv4 } from "uuid";

export const GET = withUser(async () => {
  try { return NextResponse.json(getAllDays()); }
  catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
});

export const POST = withUser(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const existingDays = getAllDays();
    const maxNumber = existingDays.reduce((max, d) => Math.max(max, d.dayNumber), 0);
    const day = {
      id: uuidv4(), projectId: body.projectId || "default",
      dayNumber: body.dayNumber || (maxNumber + 1),
      date: body.date || null, label: body.label || null,
      accommodationId: body.accommodationId || null,
      items: [], notesContent: body.notesContent || "",
      notesMentions: body.notesMentions || [],
      createdAt: now, updatedAt: now,
    };
    insertDay(day);
    return NextResponse.json(day, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
