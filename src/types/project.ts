// ========== Project Types ==========
import type { POI } from "./poi";
import type { Edge } from "./edge";
import type { Day } from "./schedule";

export interface ProjectMetadata {
  name: string;
  description: string;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoadbookProject {
  version: "1.0";
  metadata: ProjectMetadata;
  pois: POI[];
  edges: Edge[];
  days: Day[];
  shareId: string | null;
  exportedAt: string;
}

export interface ShareLink {
  id: string;
  createdAt: string;
  expiresAt: string | null;
  viewCount: number;
  isActive: boolean;
}
