import { NextRequest, NextResponse } from "next/server";
import { searchAlongRoute } from "@/lib/geo/along-route";

export async function POST(req: NextRequest) {
  try {
    const { polyline, keywords, radius, interval } = await req.json();
    if (!polyline || !keywords) return NextResponse.json({ error: "polyline and keywords required" }, { status: 400 });
    return NextResponse.json({ pois: await searchAlongRoute(polyline, keywords, radius || 3000, interval || 5000) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
