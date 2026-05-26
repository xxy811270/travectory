import { NextResponse } from "next/server";
import { getAllPois, getAllEdges, getAllDays, getProjectMeta } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";

export const GET = withUser(async () => {
  try {
    const metadata = getProjectMeta();
    const project = {
      version: "1.0", metadata,
      pois: getAllPois(), edges: getAllEdges(), days: getAllDays(),
      shareId: null, exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(project, null, 2);
    const safeName = encodeURIComponent(metadata.name || "roadbook");
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${safeName}.roadbook.json`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
