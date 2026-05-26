import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/db/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }
    const user = login(username, password);
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 401 });
  }
}
