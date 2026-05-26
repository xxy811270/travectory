import { NextRequest, NextResponse } from "next/server";
import { calculateDrivingRoute, calculateCyclingRoute, calculateWalkingRoute } from "@/lib/amap";

export async function POST(req: NextRequest) {
  try {
    const { origin, destination, mode, strategy, waypoints } = await req.json();
    if (!origin || !destination) return NextResponse.json({ error: "origin and destination required" }, { status: 400 });
    let routes;
    if (mode === "driving") routes = await calculateDrivingRoute(origin, destination, strategy, waypoints);
    else if (mode === "cycling") routes = await calculateCyclingRoute(origin, destination);
    else if (mode === "walking") routes = await calculateWalkingRoute(origin, destination);
    else return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    return NextResponse.json({ routes });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
