"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileJson, FileText, Image, Import, Pencil, Share2, Smartphone, Upload } from "lucide-react";
import { mobileProjectApi, localProjectFiles } from "../lib/local-api";
import { parseRoadbookFile, summarizeRoadbook } from "../lib/roadbook-format";
import { buildGpx, buildRoadbookHtml, buildRoadbookPng } from "../lib/client-export";
import type { Day, Edge, Poi, ProjectListItem } from "../types";

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }>; }

export function MobileTools({ project, days, pois, edges, onChanged, onRenamed }: { project: ProjectListItem; days: Day[]; pois: Poi[]; edges: Edge[]; onChanged: () => Promise<void>; onRenamed: (name: string) => void }) {
  const [name,setName]=useState(project.name); const [working,setWorking]=useState(""); const [message,setMessage]=useState(""); const [shareUrl,setShareUrl]=useState(""); const [installEvent,setInstallEvent]=useState<InstallEvent|null>(null); const [canUndo,setCanUndo]=useState(false); const importRef=useRef<HTMLInputElement>(null); const gpxRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{void localProjectFiles.canUndo(project.id).then(setCanUndo);const handler=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallEvent);};window.addEventListener("beforeinstallprompt",handler);return()=>window.removeEventListener("beforeinstallprompt",handler);},[project.id]);
  const run=async(label:string,action:()=>Promise<void>)=>{setWorking(label);setMessage("");try{await action();setMessage(`${label}完成`);}catch(reason){setMessage(reason instanceof Error?reason.message:`${label}失败`);}finally{setWorking("");}};
  const rename=()=>run("名称保存",async()=>{const value=name.trim();if(!value)throw new Error("名称不能为空");await mobileProjectApi.rename(project.userId,project.id,value);onRenamed(value);});
  const downloadJson=async()=>{const data=await localProjectFiles.export(project.id);downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"}),`${project.name}.roadbook.json`);};
  const download=async(path:string,filename:string,_method="GET",data?:unknown)=>{if(path==="/api/export/json")return downloadJson();if(path==="/api/export/html")return downloadBlob(new Blob([buildRoadbookHtml(project.name,project.description,days,pois,edges)],{type:"text/html;charset=utf-8"}),filename);if(path==="/api/export/image")return downloadBlob(await buildRoadbookPng(project.name,days,pois,edges),filename);if(path==="/api/export/gpx"){const day=days.find(item=>item.id===(data as {dayId?:string})?.dayId);if(!day)throw new Error("没有可导出的日程");return downloadBlob(new Blob([buildGpx(day,pois,edges)],{type:"application/gpx+xml;charset=utf-8"}),filename);}throw new Error("不支持的导出格式");};
  const stamp=()=>{const now=new Date();return `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;};
  const importFile=async(file:File,type:"roadbook"|"gpx")=>run(type==="roadbook"?"路书覆盖":"轨迹导入",async()=>{if(type==="gpx")throw new Error("GPX 本地导入将在静态导出阶段接入");const data=parseRoadbookFile(JSON.parse(await file.text()));const summary=summarizeRoadbook(data);if(!confirm(`将用“${summary.name}”覆盖当前路书。\n${summary.dayCount} 天 · ${summary.poiCount} 个 POI · ${summary.edgeCount} 条路线\n\n覆盖前会自动创建恢复快照，是否继续？`))return;await localProjectFiles.replace(project.id,data,`覆盖自 ${file.name}`);setCanUndo(true);onRenamed(summary.name);await onChanged();});
  const undoImport=()=>run("撤回覆盖",async()=>{if(!confirm("恢复覆盖前的路书版本？当前覆盖后的内容将被替换。"))return;const restored=await localProjectFiles.undo(project.id);setCanUndo(await localProjectFiles.canUndo(project.id));onRenamed(restored.name);setName(restored.name);await onChanged();});
  const createShare=()=>run("分享路书文件",async()=>{const data=await localProjectFiles.export(project.id);const file=new File([JSON.stringify(data,null,2)],`${project.name}.roadbook.json`,{type:"application/json"});if(navigator.canShare?.({files:[file]}))await navigator.share({title:project.name,text:"Travectory 路书备份",files:[file]});else{downloadBlob(file,file.name);setShareUrl("已保存路书文件，可通过系统文件管理器发送");}});
  return <section className="tools-screen">
    <div className="tools-heading"><b>路书工具</b><small>本地项目、导出与安装</small></div>
    <div className="tool-card rename-tool"><span><Pencil size={18}/></span><div><b>路书名称</b><input value={name} onChange={(event)=>setName(event.target.value)}/></div><button onClick={()=>void rename()} disabled={!!working}>保存</button></div>
    <h3>导出</h3>
    <div className="tool-grid">
      <button onClick={()=>void run("PNG长图导出",()=>download("/api/export/image",`${project.name}_${stamp()}.png`))}><Image size={22}/><b>PNG 长图</b><small>离线路线总览长图</small></button>
      <button onClick={()=>void run("HTML导出",()=>download("/api/export/html",`${project.name}_${stamp()}.html`))}><FileText size={22}/><b>HTML 路书</b><small>完整离线页面</small></button>
      <button onClick={()=>void run("JSON导出",downloadJson)}><FileJson size={22}/><b>JSON 备份</b><small>桌面端可重新导入</small></button>
      <button onClick={()=>{const day=days[0];if(day)void run("GPX导出",()=>download("/api/export/gpx",`day-${day.dayNumber}.gpx`,"POST",{dayId:day.id}));}}><Download size={22}/><b>GPX</b><small>导出第一天轨迹</small></button>
    </div>
    <h3>导入、恢复与分享</h3>
    <div className="tool-list">
      <button onClick={()=>importRef.current?.click()}><span><Upload size={19}/></span><div><b>覆盖导入路书</b><small>校验并保存覆盖前快照</small></div><Import size={18}/></button>
      {canUndo&&<button onClick={()=>void undoImport()}><span><Download size={19}/></span><div><b>撤回上一次覆盖</b><small>恢复覆盖前的完整路书</small></div><Download size={18}/></button>}
      <button onClick={()=>void createShare()}><span><Share2 size={19}/></span><div><b>分享路书文件</b><small>{shareUrl||"通过手机系统发送 JSON 备份"}</small></div><Share2 size={18}/></button>
      <button onClick={()=>installEvent?void installEvent.prompt():setMessage("浏览器暂未提供安装入口，可使用菜单中的“添加到主屏幕”")}><span><Smartphone size={19}/></span><div><b>安装到主屏幕</b><small>PWA 移动应用</small></div><Download size={18}/></button>
    </div>
    <input ref={importRef} hidden type="file" accept=".json,.roadbook.json" onChange={(event)=>event.target.files?.[0]&&void importFile(event.target.files[0],"roadbook")}/>
    <input ref={gpxRef} hidden type="file" accept=".gpx,.kml" onChange={(event)=>event.target.files?.[0]&&void importFile(event.target.files[0],"gpx")}/>
    {(working||message)&&<div className={`tools-message ${working?"working":""}`}>{working?`${working}中...`:message}</div>}
  </section>;
}

function downloadBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
