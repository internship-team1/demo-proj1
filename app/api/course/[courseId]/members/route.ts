import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";


export async function GET(req: NextRequest) {
  // 从 URL 中解析 courseId
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const courseIdStr = pathParts[pathParts.indexOf("course") + 1];
  const courseId = Number(courseIdStr);

  if (!courseId) return NextResponse.json({ error: "缺少课程ID" }, { status: 400 });

  // 查询课程，拿到 speakerId
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { speakerId: true }
  });

  // 查询该课程所有成员及其用户信息
  const members = await prisma.courseMember.findMany({
    where: { courseId },
    include: { user: true },
  });

  // 返回所有成员，并标记 isSpeaker
  const students = members.map(m => ({
    id: m.user.id,
    username: m.user.username,
    role: m.user.role,
    isSpeaker: course?.speakerId === m.user.id
  }));

  return NextResponse.json(students);
}

export async function DELETE(req: NextRequest) {
  // 从请求体获取 courseId 和 userId
  const { courseId, userId } = await req.json();
  if (!courseId || !userId) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  try {
    // 删除成员
    await prisma.courseMember.delete({
      where: {
        courseId_userId: {
          courseId: Number(courseId),
          userId: Number(userId)
        }
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "移除成员失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // 从 URL 和 body 获取参数
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const courseIdStr = pathParts[pathParts.indexOf("course") + 1];
  const courseId = Number(courseIdStr);

  const { username } = await req.json();
  if (!courseId || !username) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  // 查找用户
  const user = await prisma.users.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  // 检查是否已是成员
  const exist = await prisma.courseMember.findUnique({
    where: { courseId_userId: { courseId, userId: user.id } }
  });
  if (exist) {
    return NextResponse.json({ error: "已是成员" }, { status: 409 });
  }

  // 添加成员
  await prisma.courseMember.create({
    data: { courseId, userId: user.id }
  });

  return NextResponse.json({ success: true });
}
