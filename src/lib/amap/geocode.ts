// ========== Amap Geocoding ==========
import { amapGet } from "./client";
import type { AmapGeocodeResponse, AmapReGeocodeResponse } from "@/types";

export async function geocode(
  address: string,
  city?: string
): Promise<{ lng: number; lat: number; formattedAddress: string } | null> {
  const data = await amapGet<AmapGeocodeResponse>("/v3/geocode/geo", {
    address,
    city,
  });

  if (data.status !== "1" || !data.geocodes.length) return null;

  const [lng, lat] = data.geocodes[0].location.split(",").map(Number);
  return {
    lng,
    lat,
    formattedAddress: data.geocodes[0].formatted_address,
  };
}

export async function reGeocode(
  lng: number,
  lat: number
): Promise<{ address: string; nearbyPois: Array<{ id: string; name: string; address: string }> }> {
  const location = `${lng},${lat}`;
  const data = await amapGet<AmapReGeocodeResponse>("/v3/geocode/regeo", {
    location,
    extensions: "all",
    radius: 300,
  });

  if (data.status !== "1") {
    return { address: "未知地址", nearbyPois: [] };
  }

  const nearbyPois = (data.regeocode.pois || []).map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address || "",
  }));

  return {
    address: data.regeocode.formatted_address,
    nearbyPois,
  };
}
