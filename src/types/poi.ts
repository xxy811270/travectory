// ========== POI Types ==========

export type POITag = "normal" | "hotel" | "restaurant" | "gas_station";

export const POI_TAG_LABELS: Record<POITag, string> = {
  normal: "普通点",
  hotel: "住宿点",
  restaurant: "餐饮点",
  gas_station: "加油站",
};

export const POI_TAG_COLORS: Record<POITag, string> = {
  normal: "#3b82f6",
  hotel: "#ef4444",
  restaurant: "#f59e0b",
  gas_station: "#10b981",
};

export interface POI {
  id: string;
  name: string;
  lng: number;
  lat: number;
  address: string;
  tag: POITag;
  amapPoiId?: string;
  phone: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface POICreateInput {
  name: string;
  lng: number;
  lat: number;
  address?: string;
  tag?: POITag;
  phone?: string;
  notes?: string;
}

export interface AmapPOIResult {
  id: string;
  name: string;
  location: string;
  address: string;
  type: string;
  typecode: string;
  tel?: string;
}
