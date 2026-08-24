import { NextRequest, NextResponse } from "next/server";
import { importTransferFile } from "@/lib/db/roadbook-transfer";
import { withUser } from "@/lib/db/route-utils";
import { getCurrentProjectId } from "@/lib/db/context";

export const POST = withUser(async (req: NextRequest) => {
  try {
    const body = await req.json();
    return NextResponse.json(importTransferFile(getCurrentProjectId(),body,{snapshot:true,reason:"桌面端 JSON 覆盖"}));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
