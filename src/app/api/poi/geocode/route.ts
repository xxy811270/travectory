import { NextRequest, NextResponse } from "next/server";
import { geocode, reGeocode } from "@/lib/amap/geocode";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.address) return NextResponse.json(await geocode(body.address, body.city));
    const radius = body.radius || 300;
    if (body.lng !== undefined && body.lat !== undefined) return NextResponse.json(await reGeocode(body.lng, body.lat, radius));
    return NextResponse.json({ error: "address or coordinates required" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
