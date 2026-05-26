import { NextRequest, NextResponse } from "next/server";
import { getProjectMeta, updateProjectMeta } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";

export const GET = withUser(async () => {
  try { return NextResponse.json(getProjectMeta()); }
  catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
});

export const PUT = withUser(async (req: NextRequest) => {
  try {
    updateProjectMeta(await req.json());
    return NextResponse.json(getProjectMeta());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
