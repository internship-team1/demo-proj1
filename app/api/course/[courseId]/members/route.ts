import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: Request, { params }: { params: { courseId: string } }) {
  const courseId = Number(params.courseId);
  if (!courseId) return NextResponse.json({ error: "缺少课程ID" }, { status: 400 });

  // 查询该课程所有成员及其用户信息
  const members = await prisma.courseMember.findMany({
    where: { courseId },
    include: { user: true },
  });

  // 只返回听众（role: "audience"）信息
  const students = members
    .filter(m => m.user.role === "audience")
    .map(m => ({
      id: m.user.id,
      username: m.user.username,
      role: m.user.role,
    }));

  return NextResponse.json(students);
}
