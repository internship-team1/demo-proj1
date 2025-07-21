import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = Number(req.nextUrl.searchParams.get("userId"));
  if (!userId) return NextResponse.json({ hasNewStatistics: false });

  // 获取用户
  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user || (user.role !== "organizer" && user.role !== "speaker")) {
    return NextResponse.json({ hasNewStatistics: false });
  }

  // 获取相关课程
  let courses;
  if (user.role === "organizer") {
    courses = await prisma.course.findMany({ where: { organizerId: userId } });
  } else {
    courses = await prisma.course.findMany({ where: { speakerId: userId } });
  }
  const courseIds = (courses as { id: number }[]).map((c) => c.id);

  // 当前时间
  const now = new Date();

  // 查询所有已到答题截止时间的 Quiz
  const quizzes = await prisma.quiz.findMany({
    where: {
      courseId: { in: courseIds },
      createdAt: { lte: new Date(now.getTime() - 2 * 60 * 1000) }, // 2分钟已到
      // 你可以根据需要调整时间判断
    },
    orderBy: { createdAt: "desc" }
  });

  // 返回最近一个 Quiz
  if (quizzes.length > 0) {
    const quiz = quizzes[0];
    return NextResponse.json({
      hasNewStatistics: true,
      quizId: quiz.id,
      quizTitle: quiz.title,
      notifyTime: new Date(quiz.createdAt.getTime() + 2 * 60 * 1000)
    });
  }

  return NextResponse.json({ hasNewStatistics: false });
}
