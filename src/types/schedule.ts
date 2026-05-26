// ========== Schedule Types ==========

export interface StayDuration {
  hours: number;
  minutes: number;
}

export interface ScheduleItem {
  id: string;
  dayId: string;
  poiId: string;
  order: number;
  arrivalTime: string | null;
  departureTime: string | null;
  stayDuration: StayDuration | null;
  fromEdgeId: string | null;
  notes: string;
}

export interface Day {
  id: string;
  projectId: string;
  dayNumber: number;
  date: string | null;
  label: string | null;
  accommodationId: string | null;
  items: ScheduleItem[];
  notesContent: string;
  notesMentions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DaySummary {
  totalDistance: number;
  drivingDistance: number;
  nonDrivingDistance: number;
  totalDuration: number;
  drivingDuration: number;
  nonDrivingDuration: number;
}

export interface SmartCompleteResult {
  detectedEdges: Array<{
    fromPOIId: string;
    toPOIId: string;
    edgeId: string | null;
    transportMode: string;
    distance: number;
    duration: number;
  }>;
  warnings: string[];
}
