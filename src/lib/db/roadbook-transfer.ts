import fs from "fs";
import path from "path";
import { getDb } from "./connection";
import { getAllPois } from "./poi-queries";
import { getAllEdges } from "./edge-queries";
import { getAllDays } from "./schedule-queries";
import { getProjectMeta } from "./project-queries";
import { renameProject, updateProjectStats } from "./auth";
import type { Day, Edge, POI, ProjectMetadata } from "@/types";

interface TransferFile { version: string; metadata: ProjectMetadata; pois: POI[]; edges: Edge[]; days: Day[]; exportedAt?: string; }

export function parseTransferFile(value: unknown): TransferFile {
  if (!record(value) || !record(value.metadata) || !Array.isArray(value.pois) || !Array.isArray(value.edges) || !Array.isArray(value.days)) throw new Error("无效的 .roadbook.json 文件");
  const file = value as unknown as TransferFile;
  if (!String(file.metadata.name || "").trim()) throw new Error("路书名称不能为空");
  const poiIds = unique(file.pois, "POI"); const edgeIds = unique(file.edges, "路线"); unique(file.days, "日程");
  for (const poi of file.pois) if (!Number.isFinite(Number(poi.lng)) || !Number.isFinite(Number(poi.lat))) throw new Error(`POI“${poi.name}”坐标无效`);
  for (const edge of file.edges) if (!poiIds.has(edge.originId) || !poiIds.has(edge.destinationId)) throw new Error(`路线 ${edge.id} 引用了不存在的 POI`);
  const itemIds = new Set<string>();
  for (const day of file.days) for (const item of day.items) { if (itemIds.has(item.id)) throw new Error(`日程项目 ID 重复：${item.id}`); itemIds.add(item.id); if (!poiIds.has(item.poiId)) throw new Error(`日程项目 ${item.id} 引用了不存在的 POI`); if (item.fromEdgeId && !edgeIds.has(item.fromEdgeId)) throw new Error(`日程项目 ${item.id} 引用了不存在的路线`); }
  return file;
}

export function importTransferFile(projectId: string, value: unknown, options: { snapshot: boolean; reason?: string }): { success: true; projectName: string; poiCount: number; edgeCount: number; dayCount: number } {
  const file = parseTransferFile(value);
  if (options.snapshot) saveSnapshot(projectId, options.reason || "JSON 覆盖导入");
  const db = getDb(projectId); const now = new Date().toISOString();
  const apply = db.transaction(() => {
    db.prepare("DELETE FROM schedule_items").run(); db.prepare("DELETE FROM days").run(); db.prepare("DELETE FROM edges").run(); db.prepare("DELETE FROM pois").run();
    const insPoi = db.prepare("INSERT INTO pois (id,name,lng,lat,address,tag,amap_poi_id,phone,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    for (const p of file.pois) insPoi.run(p.id,p.name,p.lng,p.lat,p.address||"",p.tag||"normal",p.amapPoiId||null,p.phone||"",p.notes||"",p.createdAt||now,p.updatedAt||now);
    const insEdge = db.prepare("INSERT INTO edges (id,origin_id,destination_id,transport_mode,selected_route_index,driving_routes,cycling_routes,walking_routes,custom_route,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    for (const e of file.edges) insEdge.run(e.id,e.originId,e.destinationId,e.transportMode,e.selectedRouteIndex||0,JSON.stringify(e.drivingRoutes||[]),JSON.stringify(e.cyclingRoutes||[]),JSON.stringify(e.walkingRoutes||[]),e.customRoute?JSON.stringify(e.customRoute):null,e.createdAt||now,e.updatedAt||now);
    const insDay = db.prepare("INSERT INTO days (id,project_id,day_number,date,label,accommodation_id,notes_content,notes_mentions,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
    const insItem = db.prepare("INSERT INTO schedule_items (id,day_id,poi_id,item_order,arrival_time,departure_time,stay_hours,stay_minutes,from_edge_id,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
    for (const d of [...file.days].sort((a,b)=>a.dayNumber-b.dayNumber)) { insDay.run(d.id,"default",d.dayNumber,d.date||null,d.label||null,d.accommodationId||null,d.notesContent||"",JSON.stringify(d.notesMentions||[]),d.createdAt||now,d.updatedAt||now); for (const item of [...d.items].sort((a,b)=>a.order-b.order)) insItem.run(item.id,d.id,item.poiId,item.order,item.arrivalTime||null,item.departureTime||null,item.stayDuration?.hours||0,item.stayDuration?.minutes||0,item.fromEdgeId||null,item.notes||"",now,now); }
    db.prepare("UPDATE project_meta SET name=?,description=?,cover_image=?,updated_at=? WHERE id='default'").run(file.metadata.name,file.metadata.description||"",file.metadata.coverImage||null,now);
  });
  apply(); renameProject(projectId,file.metadata.name); updateProjectStats(projectId,file.pois.length,file.edges.length,file.days.length);
  return { success:true,projectName:file.metadata.name,poiCount:file.pois.length,edgeCount:file.edges.length,dayCount:file.days.length };
}

export function undoLatestTransfer(projectId: string) { const snapshots=listSnapshots(projectId); if(!snapshots.length)throw new Error("没有可撤回的覆盖记录"); const latest=snapshots[0]; const value=JSON.parse(fs.readFileSync(latest.path,"utf8")); const result=importTransferFile(projectId,value,{snapshot:false}); fs.unlinkSync(latest.path); return result; }
export function hasTransferSnapshot(projectId: string): boolean { return listSnapshots(projectId).length>0; }

function saveSnapshot(projectId:string,reason:string){const directory=snapshotDirectory(projectId);fs.mkdirSync(directory,{recursive:true});const value={format:"travectory-roadbook",formatVersion:2,version:"2.0",metadata:getProjectMeta(),pois:getAllPois(),edges:getAllEdges(),days:getAllDays(),exportedAt:new Date().toISOString(),snapshotReason:reason};const filename=`${Date.now()}_${safe(reason)}.json`;fs.writeFileSync(path.join(directory,filename),JSON.stringify(value));for(const old of listSnapshots(projectId).slice(5))fs.unlinkSync(old.path);}
function listSnapshots(projectId:string){const directory=snapshotDirectory(projectId);if(!fs.existsSync(directory))return[];return fs.readdirSync(directory).filter(name=>name.endsWith(".json")).map(name=>({name,path:path.join(directory,name)})).sort((a,b)=>b.name.localeCompare(a.name));}
function snapshotDirectory(projectId:string){return path.join(process.cwd(),"data","import-snapshots",safe(projectId));}
function safe(value:string){return value.replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,80)||"snapshot";}
function unique(items:Array<{id:string}>,label:string){const ids=new Set<string>();for(const item of items){if(!item?.id)throw new Error(`${label} ID 不能为空`);if(ids.has(item.id))throw new Error(`${label} ID 重复：${item.id}`);ids.add(item.id);}return ids;}
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==="object"&&!Array.isArray(value);}
