import { NextRequest, NextResponse } from "next/server";
import { createProject, deleteProject } from "@/lib/db/auth";
import { importTransferFile, parseTransferFile } from "@/lib/db/roadbook-transfer";
import { runWithUser, setCurrentProject } from "@/lib/db/context";

export async function POST(req: NextRequest) {
  const userId=req.headers.get("x-user-id")||"default"; let createdId="";
  try { const body=await req.json(); const file=parseTransferFile(body); const project=createProject(userId,file.metadata.name); createdId=project.id; const result=runWithUser(userId,()=>{setCurrentProject(project.id);return importTransferFile(project.id,file,{snapshot:false});}); return NextResponse.json({...project,name:result.projectName,poiCount:result.poiCount,edgeCount:result.edgeCount,dayCount:result.dayCount},{status:201}); }
  catch(error){if(createdId)deleteProject(createdId);return NextResponse.json({error:error instanceof Error?error.message:"导入失败"},{status:400});}
}
