import { NextRequest, NextResponse } from "next/server";
import { searchPois, searchAround } from "@/lib/amap/search";

export async function POST(req: NextRequest) {
  try {
    const { keywords, city, types, lng, lat, radius } = await req.json();
    if (lng !== undefined && lat !== undefined) {
      return NextResponse.json({ pois: await searchAround(lng, lat, keywords, types, radius) });
    }
    if (keywords) {
      return NextResponse.json(await searchPois(keywords, city, types));
    }
    return NextResponse.json({ pois: [], count: "0" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
