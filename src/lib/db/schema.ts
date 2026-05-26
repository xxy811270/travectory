// ========== Database Schema & Migration ==========

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS pois (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  lng           REAL NOT NULL,
  lat           REAL NOT NULL,
  address       TEXT DEFAULT '',
  tag           TEXT DEFAULT 'normal' CHECK(tag IN ('normal','hotel','restaurant','gas_station')),
  amap_poi_id   TEXT,
  phone         TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS edges (
  id                    TEXT PRIMARY KEY,
  origin_id             TEXT NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  destination_id        TEXT NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  transport_mode        TEXT NOT NULL CHECK(transport_mode IN ('driving','cycling','walking','train','flight','ferry')),
  selected_route_index  INTEGER DEFAULT 0,
  driving_routes        TEXT DEFAULT '[]',
  cycling_routes        TEXT DEFAULT '[]',
  walking_routes        TEXT DEFAULT '[]',
  custom_route          TEXT,
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS days (
  id                TEXT PRIMARY KEY,
  project_id        TEXT DEFAULT 'default',
  day_number        INTEGER NOT NULL,
  date              TEXT,
  label             TEXT,
  accommodation_id  TEXT REFERENCES pois(id),
  notes_content     TEXT DEFAULT '',
  notes_mentions    TEXT DEFAULT '[]',
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id, day_number)
);

CREATE TABLE IF NOT EXISTS schedule_items (
  id              TEXT PRIMARY KEY,
  day_id          TEXT NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  poi_id          TEXT NOT NULL REFERENCES pois(id),
  item_order      INTEGER NOT NULL,
  arrival_time    TEXT,
  departure_time  TEXT,
  stay_hours      INTEGER DEFAULT 0,
  stay_minutes    INTEGER DEFAULT 0,
  from_edge_id    TEXT REFERENCES edges(id),
  notes           TEXT DEFAULT '',
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_meta (
  id          TEXT PRIMARY KEY DEFAULT 'default',
  name        TEXT DEFAULT '未命名路书',
  description TEXT DEFAULT '',
  cover_image TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS share_links (
  id          TEXT PRIMARY KEY,
  user_id     TEXT DEFAULT 'default',
  project_id  TEXT DEFAULT 'default',
  created_at  TEXT DEFAULT (datetime('now')),
  expires_at  TEXT,
  view_count  INTEGER DEFAULT 0,
  is_active   INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_edges_origin ON edges(origin_id);
CREATE INDEX IF NOT EXISTS idx_edges_destination ON edges(destination_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_day ON schedule_items(day_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_order ON schedule_items(day_id, item_order);
CREATE INDEX IF NOT EXISTS idx_pois_tag ON pois(tag);
`;
