// ========== Amap POI Search ==========
import { amapGet } from "./client";
import type { AmapSearchResponse, AmapPOIResult } from "@/types";

export async function searchPois(
  keywords: string,
  city?: string,
  types?: string,
  offset: number = 20,
  page: number = 1
): Promise<{ pois: AmapPOIResult[]; count: string }> {
  const data = await amapGet<AmapSearchResponse>("/v3/place/text", {
    keywords,
    city,
    types,
    offset,
    page,
    extensions: "all",
  });

  if (data.status !== "1") {
    throw new Error(`POI search failed: ${data.info}`);
  }

  return {
    pois: data.pois || [],
    count: data.count,
  };
}

export async function searchAround(
  lng: number,
  lat: number,
  keywords?: string,
  types?: string,
  radius: number = 3000,
  offset: number = 20
): Promise<AmapPOIResult[]> {
  const location = `${lng},${lat}`;
  const data = await amapGet<AmapSearchResponse>("/v3/place/around", {
    location,
    keywords,
    types,
    radius,
    offset,
    extensions: "all",
  });

  if (data.status !== "1") return [];
  return data.pois || [];
}
