import { NextRequest, NextResponse } from "next/server";
import {prisma} from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courseId = Number(searchParams.get("courseId"));
  if (!courseId) return NextResponse.json({ error: "缺少课程ID" }, { status: 400 });

  // 查询该课程下所有quiz
  const quizzes = await prisma.quiz.findMany({
    where: { courseId },
    include: {
      questions: {
        include: { options: true }
      }
    }
  });

  // 统计每个题目的答对人数和总人数
  const result = [];
  for (const quiz of quizzes) {
    const questions = [];
    for (const q of quiz.questions) {
      // 总作答人数
      const total = await prisma.answer.count({
        where: { questionId: q.id }
      });
      // 答对人数
      let correct = 0;
      if (q.correctOptionId) {
        correct = await prisma.answer.count({
          where: {
            questionId: q.id,
            optionId: q.correctOptionId
          }
        });
      }
      questions.push({
        questionId: q.id,
        questionText: q.content,
        total,
        correct
      });
    }
    result.push({
      quizId: quiz.id,
      quizTitle: quiz.title,
      questions
    });
  }

  return NextResponse.json(result);
}
