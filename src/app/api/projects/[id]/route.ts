import { NextRequest, NextResponse } from "next/server";
import { deleteProject, getProjectById, renameProject } from "@/lib/db/auth";
import { updateProjectMeta } from "@/lib/db";
import { runWithUser, setCurrentProject } from "@/lib/db/context";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    deleteProject((await params).id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const userId = req.headers.get("x-user-id") || "default";
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "路书名称不能为空" }, { status: 400 });
    if (name.length > 100) return NextResponse.json({ error: "路书名称不能超过 100 个字符" }, { status: 400 });
    if (!getProjectById(id, userId)) {
      return NextResponse.json({ error: "路书不存在" }, { status: 404 });
    }
    renameProject(id, name);
    runWithUser(userId, () => {
      setCurrentProject(id);
      updateProjectMeta({ name });
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
