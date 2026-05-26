// ========== Edge / Route Types ==========

export type TransportMode = "driving" | "cycling" | "walking" | "train" | "flight" | "ferry";

export const TRANSPORT_LABELS: Record<TransportMode, string> = {
  driving: "驾车",
  cycling: "骑行",
  walking: "步行",
  train: "火车",
  flight: "飞机",
  ferry: "轮船",
};

export const TRANSPORT_COLORS: Record<TransportMode, string> = {
  driving: "#3b82f6",
  cycling: "#10b981",
  walking: "#f59e0b",
  train: "#ef4444",
  flight: "#8b5cf6",
  ferry: "#06b6d4",
};

export interface RouteStep {
  instruction: string;
  polyline: [number, number][];
  distance: number;
  duration: number;
  road?: string;
}

export interface RoutePath {
  distance: number;
  duration: number;
  tolls: number;
  tollDistance?: number;
  trafficLights?: number;
  strategy?: string;
  polyline: [number, number][];
  steps: RouteStep[];
}

export interface CustomRoute {
  distance: number;
  duration: number;
  polyline: [number, number][];
  routeName?: string;
  routeNumber?: string;
  notes?: string;
}

export interface Edge {
  id: string;
  originId: string;
  destinationId: string;
  transportMode: TransportMode;
  drivingRoutes: RoutePath[];
  cyclingRoutes: RoutePath[];
  walkingRoutes: RoutePath[];
  customRoute: CustomRoute | null;
  selectedRouteIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface EdgeCreateInput {
  originId: string;
  destinationId: string;
  transportMode: TransportMode;
}
