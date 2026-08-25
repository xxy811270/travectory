import { Capacitor, registerPlugin } from "@capacitor/core";

interface StaticMapPlugin { fetch(options: { url: string }): Promise<{ dataUrl: string }>; }
const StaticMap = registerPlugin<StaticMapPlugin>("StaticMap");

export async function fetchStaticMapBlob(url: string): Promise<Blob> {
  if (!Capacitor.isNativePlatform()) {
    const response = await fetch(url, { cache: "no-store", referrerPolicy: "no-referrer" });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/")) throw new Error("静态地图请求失败");
    return response.blob();
  }
  const result = await StaticMap.fetch({ url });
  return (await fetch(result.dataUrl)).blob();
}
