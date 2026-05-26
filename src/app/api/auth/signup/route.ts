import { NextRequest, NextResponse } from "next/server";
import { signup } from "@/lib/db/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }
    if (username.length < 2 || username.length > 20) {
      return NextResponse.json({ error: "用户名需2-20个字符" }, { status: 400 });
    }
    if (password.length < 3) {
      return NextResponse.json({ error: "密码至少3个字符" }, { status: 400 });
    }
    const user = signup(username, password);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
