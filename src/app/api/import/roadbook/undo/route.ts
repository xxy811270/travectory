import { NextRequest, NextResponse } from "next/server";
import { hasTransferSnapshot, undoLatestTransfer } from "@/lib/db/roadbook-transfer";
import { getCurrentProjectId } from "@/lib/db/context";
import { withUser } from "@/lib/db/route-utils";

export const GET=withUser(async()=>NextResponse.json({canUndo:hasTransferSnapshot(getCurrentProjectId())}));
export const POST=withUser(async(_req:NextRequest)=>{try{return NextResponse.json(undoLatestTransfer(getCurrentProjectId()));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"撤回失败"},{status:400});}});
