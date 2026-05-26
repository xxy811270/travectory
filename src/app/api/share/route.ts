import { NextRequest, NextResponse } from "next/server";
import { createShareLink, deactivateShareLink } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import { v4 as uuidv4 } from "uuid";

export const POST = withUser(async () => {
  try { return NextResponse.json(createShareLink(uuidv4()), { status: 201 }); }
  catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
});

export const DELETE = withUser(async (req: NextRequest) => {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    deactivateShareLink(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
