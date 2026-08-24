import { NextResponse } from "next/server";
import { reverseItineraryInDb } from "@/lib/db";
import { withUser } from "@/lib/db/route-utils";

export const POST = withUser(async () => {
  try {
    return NextResponse.json(reverseItineraryInDb());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
