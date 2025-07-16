import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "用户名参数缺失" }, { status: 400 });
  }

  try {
    // 查找用户
    const user = await prisma.users.findUnique({
      where: { username },
      select: { id: true, username: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ exists: false });
    }

    // 返回用户信息和角色
    return NextResponse.json({
      exists: true,
      id: user.id,
      username: user.username,
      role: user.role
    });
  } catch (error) {
    console.error("检查用户角色时出错:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
} 