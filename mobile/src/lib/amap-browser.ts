import type { AmapPoiResult, Poi, RoutePath } from "../types";

const key = process.env.NEXT_PUBLIC_AMAP_JS_KEY || "";
const secret = process.env.NEXT_PUBLIC_AMAP_SECRET || "";
const plugins = "AMap.Marker,AMap.Polyline,AMap.Pixel,AMap.Bounds,AMap.PlaceSearch,AMap.Geocoder,AMap.Driving,AMap.Walking,AMap.Riding";

export async function ensureAmap(): Promise<any> {
  if (window.AMap?.Map) return window.AMap;
  window._AMapSecurityConfig = { securityJsCode: secret };
  let script = document.getElementById("travectory-mobile-amap") as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = "travectory-mobile-amap";
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=${encodeURIComponent(plugins)}`;
    document.head.appendChild(script);
  }
  await new Promise<void>((resolve, reject) => {
    if (window.AMap?.Map) { resolve(); return; }
    script?.addEventListener("load", () => resolve(), { once: true });
    script?.addEventListener("error", () => reject(new Error("高德地图搜索组件加载失败")), { once: true });
  });
  return window.AMap;
}

export async function searchAmapPois(keywords: string): Promise<AmapPoiResult[]> {
  const AMap = await ensureAmap();
  return new Promise((resolve, reject) => {
    AMap.plugin("AMap.PlaceSearch", () => {
      const service = new AMap.PlaceSearch({ pageSize: 20, pageIndex: 1, extensions: "all" });
      service.search(keywords, (status: string, result: any) => {
        if (status !== "complete") { reject(new Error(result?.info || "高德关键词搜索失败")); return; }
        resolve((result?.poiList?.pois || []).map((poi: any) => ({
          id: poi.id || "", name: poi.name || keywords,
          location: `${poi.location?.lng ?? ""},${poi.location?.lat ?? ""}`,
          address: typeof poi.address === "string" ? poi.address : "",
          type: poi.type || "", typecode: poi.typecode || "", tel: typeof poi.tel === "string" ? poi.tel : "",
        })));
      });
    });
  });
}

export async function geocodeWithAmap(address: string): Promise<{ lng: number; lat: number; formattedAddress: string } | null> {
  const AMap = await ensureAmap();
  return new Promise((resolve, reject) => {
    AMap.plugin("AMap.Geocoder", () => {
      const geocoder = new AMap.Geocoder();
      geocoder.getLocation(address, (status: string, result: any) => {
        if (status !== "complete") { reject(new Error(result?.info || "地址解析失败")); return; }
        const item = result?.geocodes?.[0];
        if (!item?.location) { resolve(null); return; }
        resolve({ lng: item.location.lng, lat: item.location.lat, formattedAddress: item.formattedAddress || address });
      });
    });
  });
}

export async function calculateAmapRoutes(origin: Poi, destination: Poi, mode: "driving" | "walking" | "cycling", strategy = "0"): Promise<RoutePath[]> {
  const AMap = await ensureAmap();
  return new Promise((resolve, reject) => {
    const plugin = mode === "driving" ? "AMap.Driving" : mode === "walking" ? "AMap.Walking" : "AMap.Riding";
    AMap.plugin(plugin, () => {
      const options = mode === "driving" ? { policy: Number(strategy), extensions: "all", ferry: 1 } : {};
      const service = mode === "driving" ? new AMap.Driving(options) : mode === "walking" ? new AMap.Walking(options) : new AMap.Riding(options);
      service.search(new AMap.LngLat(origin.lng, origin.lat), new AMap.LngLat(destination.lng, destination.lat), (status: string, result: any) => {
        if (status !== "complete") { reject(new Error(result?.info || "路线计算失败")); return; }
        resolve((result?.routes || []).map((route: any) => ({
          distance: Number(route.distance) || 0,
          duration: Number(route.time) || 0,
          tolls: Number(route.tolls) || 0,
          strategy,
          polyline: (route.steps || []).flatMap((step: any) => (step.path || []).map((point: any) => [Number(point.lng), Number(point.lat)] as [number, number])),
        })));
      });
    });
  });
}
