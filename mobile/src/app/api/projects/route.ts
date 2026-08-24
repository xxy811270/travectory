// Kept as a static compatibility endpoint for older cached mobile shells.
// Current builds read projects directly from the device's IndexedDB.
export const dynamic = "force-static";
export function GET() { return Response.json([]); }
