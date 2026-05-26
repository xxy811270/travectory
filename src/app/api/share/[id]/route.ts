import { NextRequest, NextResponse } from "next/server";
import { getShareLink, incrementShareViewCount } from "@/lib/db";
import { getDb } from "@/lib/db/connection";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const link = getShareLink(id);
    if (!link || !link.isActive) return NextResponse.json({ error: "Link not found" }, { status: 404 });
    incrementShareViewCount(id);

    // Share is public - use the creator's DB
    // We don't know which user created the share, so just use default
    const db = getDb("default");
    const meta = db.prepare("SELECT * FROM project_meta WHERE id = 'default'").get() as Record<string, unknown>;
    const pois = db.prepare("SELECT * FROM pois").all();
    const edges = db.prepare("SELECT * FROM edges").all();
    const dayRows = db.prepare("SELECT * FROM days ORDER BY day_number").all() as Record<string, unknown>[];

    const days = dayRows.map((row) => {
      const items = db.prepare("SELECT * FROM schedule_items WHERE day_id = ? ORDER BY item_order").all(row.id as string);
      return { ...row, items, notesMentions: JSON.parse((row.notes_mentions as string) || "[]") };
    });

    return NextResponse.json({
      version: "1.0",
      metadata: { name: meta?.name, description: meta?.description, coverImage: meta?.cover_image, createdAt: meta?.created_at, updatedAt: meta?.updated_at },
      pois, edges, days,
      shareId: id, exportedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
