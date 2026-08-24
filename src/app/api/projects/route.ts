import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/db/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "default";
  try { return NextResponse.json(listProjects(userId)); }
  catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "default";
  try {
    const { name } = await req.json();
    const project = createProject(userId, name || "未命名路书");
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
