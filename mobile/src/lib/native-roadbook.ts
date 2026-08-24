import { Capacitor, registerPlugin } from "@capacitor/core";

interface RoadbookImportPlugin { getPendingImport(): Promise<{ filename?: string; text?: string }>; }
const RoadbookImport = registerPlugin<RoadbookImportPlugin>("RoadbookImport");

export function isNativeApp(): boolean { return Capacitor.isNativePlatform(); }
export async function consumeNativeRoadbook(): Promise<{ filename: string; text: string } | null> {
  if (!isNativeApp()) return null;
  const value = await RoadbookImport.getPendingImport();
  return value.text ? { filename: value.filename || "外部路书.roadbook.json", text: value.text } : null;
}
