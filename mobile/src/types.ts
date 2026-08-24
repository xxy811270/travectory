export interface ScheduleItem {
  id: string;
  dayId?: string;
  poiId: string;
  order: number;
  fromEdgeId: string | null;
  arrivalTime?: string | null;
  departureTime?: string | null;
  stayDuration?: { hours: number; minutes: number } | null;
  notes?: string;
}

export interface Day {
  id: string;
  projectId?: string;
  dayNumber: number;
  date: string | null;
  label: string | null;
  items: ScheduleItem[];
  accommodationId?: string | null;
  notesContent?: string;
  notesMentions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Poi {
  id: string;
  name: string;
  lng: number;
  lat: number;
  address?: string;
  tag: "normal" | "hotel" | "restaurant" | "gas_station";
  phone?: string;
  notes?: string;
  amapPoiId?: string;
}

export interface AmapPoiResult {
  id: string;
  name: string;
  location: string;
  address: string;
  type: string;
  typecode: string;
  tel?: string;
}

export interface RoutePath {
  distance: number;
  duration: number;
  tolls: number;
  polyline: [number, number][];
  strategy?: string;
}

export interface Edge {
  id: string;
  originId: string;
  destinationId: string;
  transportMode: string;
  drivingRoutes: RoutePath[];
  cyclingRoutes: RoutePath[];
  walkingRoutes: RoutePath[];
  customRoute: { distance: number; duration: number; polyline: [number, number][]; routeName?: string; routeNumber?: string; notes?: string } | null;
  selectedRouteIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  name: string;
  description?: string;
}

export interface ProjectListItem {
  id: string;
  userId: string;
  name: string;
  description: string;
  poiCount: number;
  edgeCount: number;
  dayCount: number;
  updatedAt: string;
}
