import { NextRequest, NextResponse } from "next/server";
import {prisma} from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courseId = Number(searchParams.get("courseId"));
  const quizId = searchParams.get("quizId") ? Number(searchParams.get("quizId")) : null;
  
  if (!courseId) return NextResponse.json({ error: "缺少课程ID" }, { status: 400 });

  // 查询课程信息，获取演讲者ID
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { speakerId: true }
  });
  
  const speakerId = course?.speakerId;

  // 查询课程听众数量（排除演讲者）
  const audienceCount = await prisma.courseMember.count({
    where: { 
      courseId,
      // 排除演讲者
      NOT: speakerId ? { userId: speakerId } : undefined
    }
  });

  // 查询课程下的问卷(可选择指定问卷ID)
  const quizzes = await prisma.quiz.findMany({
    where: quizId ? { id: quizId, courseId } : { courseId },
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
    let totalErrors = 0;
    let totalResponses = 0;
    
    // 查询提交过该问卷的用户数量（排除演讲者）
    const submittedUsers = await prisma.answer.findMany({
      where: { 
        quizId: quiz.id,
        // 排除演讲者
        userId: speakerId ? { not: speakerId } : undefined
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    
    const submittedCount = submittedUsers.length;
    
    for (const q of quiz.questions) {
      // 总作答人数（不过滤演讲者，因为我们需要知道所有答题情况）
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
      // 统计每个选项被选人数
      const options = await Promise.all(
        q.options.map(async (opt: any) => {
          const count = await prisma.answer.count({
            where: {
              questionId: q.id,
              optionId: opt.id
            }
          });
          return {
            text: opt.content,
            count
          };
        })
      );
      // 累计错误数
      totalErrors += (total - correct);
      // 累计答题数
      totalResponses += total;
      
      // 计算正确率
      const correctRate = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;
      questions.push({
        questionId: q.id,
        questionText: q.content,
        total,
        correct,
        options,
        correctRate
      });
    }
    
    // 计算未提交率和平均错误率
    const notSubmitRate = audienceCount > 0 ? ((audienceCount - submittedCount) / audienceCount) : 0;
    const errorRate = totalResponses > 0 ? (totalErrors / totalResponses) : 0;
    
    // 计算演讲效果
    const presentationEffectiveness = 1 - notSubmitRate - (errorRate / 4);
    const presentationEffectivenessPercentage = Math.round(presentationEffectiveness * 10000) / 100; // 转为百分比并保留两位小数
    
    result.push({
      quizId: quiz.id,
      quizTitle: quiz.title,
      audienceCount,
      submittedCount,
      notSubmitRate: Math.round(notSubmitRate * 10000) / 100, // 转为百分比并保留两位小数
      errorRate: Math.round(errorRate * 10000) / 100, // 转为百分比并保留两位小数
      presentationEffectiveness: presentationEffectivenessPercentage,
      questions
    });
  }

  return NextResponse.json(result);
}
