import { NextRequest, NextResponse } from "next/server";
import { geocode, reGeocode } from "@/lib/amap/geocode";

export async function POST(req: NextRequest) {
  try {
    const { address, lng, lat, city } = await req.json();
    if (address) return NextResponse.json(await geocode(address, city));
    if (lng !== undefined && lat !== undefined) return NextResponse.json(await reGeocode(lng, lat));
    return NextResponse.json({ error: "address or coordinates required" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
