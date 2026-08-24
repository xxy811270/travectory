import { NextResponse } from "next/server";
import { getAllPois, getAllEdges, getAllDays, getProjectMeta } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";
import { renderRoadbookLongImage } from "@/lib/export/long-image";
import { getCurrentProjectId, getCurrentUserId } from "@/lib/db/context";
import { getProjectById } from "@/lib/db/auth";

function exportFilename(name: string): string {
  const dateStamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()).replace(/-/g, "");
  const safeName = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "路书";
  return `${safeName}_${dateStamp}.png`;
}

export const GET = withUser(async () => {
  try {
    const storedMeta = getProjectMeta();
    const project = getProjectById(getCurrentProjectId(), getCurrentUserId());
    const meta = {
      ...storedMeta,
      name: project?.name || storedMeta.name,
      description: project?.description || storedMeta.description,
    };
    const png = await renderRoadbookLongImage(meta, getAllPois(), getAllEdges(), getAllDays());
    const filename = encodeURIComponent(exportFilename(meta.name));
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
