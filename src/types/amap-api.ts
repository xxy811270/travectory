// ========== Amap API Types ==========

export interface AmapDrivingRoute {
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  tolls: string;
  toll_distance: string;
  traffic_lights: string;
  strategy: string;
  steps: AmapStep[];
}

export interface AmapStep {
  instruction: string;
  orientation: string;
  road: string;
  distance: string;
  duration: string;
  polyline: string;
  action: string;
  assistant_action: string;
  cities?: Array<{ name: string; adcode: string }>;
}

export interface AmapRouteResponse {
  status: string;
  info: string;
  count: string;
  route: {
    origin: string;
    destination: string;
    taxi_cost?: string;
    paths: AmapDrivingRoute[];
  };
}

export interface AmapSearchResponse {
  status: string;
  info: string;
  count: string;
  pois: Array<{
    id: string;
    name: string;
    type: string;
    typecode: string;
    address: string;
    location: string;
    tel?: string;
    distance?: string;
  }>;
}

export interface AmapGeocodeResponse {
  status: string;
  info: string;
  count: string;
  geocodes: Array<{
    formatted_address: string;
    location: string;
    level: string;
  }>;
}

export interface AmapReGeocodeResponse {
  status: string;
  info: string;
  regeocode: {
    formatted_address: string;
    pois: Array<{
      id: string;
      name: string;
      type: string;
      address: string;
      location: string;
    }>;
  };
}
