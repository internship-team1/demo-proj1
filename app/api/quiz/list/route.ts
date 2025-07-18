import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courseId = Number(searchParams.get("courseId"));
  if (!courseId) {
    return NextResponse.json({ error: "缺少课程ID" }, { status: 400 });
  }

  try {
    const quizzes = await prisma.quiz.findMany({
      where: { courseId },
      select: {
        id: true,
        courseId: true,
        title: true
      }
    });
    return NextResponse.json(quizzes);
  } catch (error) {
    return NextResponse.json({ error: "查询问卷失败" }, { status: 500 });
  }
} 