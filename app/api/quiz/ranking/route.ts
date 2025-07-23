import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quizId = Number(searchParams.get("quizId"));
  const userId = searchParams.get("userId") ? Number(searchParams.get("userId")) : null;
  
  if (!quizId) return NextResponse.json({ error: "缺少问卷ID" }, { status: 400 });

  try {
    // 获取所有提交了该问卷答案的用户
    const userAnswersMap = await prisma.answer.groupBy({
      by: ['userId'],
      where: { 
        quizId 
      },
    });

    // 获取问卷信息，包括所有题目
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: true
          }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
    }

    const totalQuestions = quiz.questions.length;

    // 计算每个用户的得分
    const userScores = await Promise.all(
      userAnswersMap.map(async (item) => {
        const userId = item.userId;
        
        // 获取该用户的所有答案
        const answers = await prisma.answer.findMany({
          where: {
            quizId,
            userId
          }
        });
        
        // 计算正确答案数
        let correctCount = 0;
        for (const answer of answers) {
          const question = quiz.questions.find(q => q.id === answer.questionId);
          if (!question) continue;
          
          const correctOption = question.options.find(o => o.isCorrect);
          if (correctOption && answer.optionId === correctOption.id) {
            correctCount++;
          }
        }
        
        // 查询用户名
        const user = await prisma.users.findUnique({
          where: { id: userId },
          select: { username: true }
        });
        
        return {
          userId,
          username: user?.username || `用户${userId}`,
          correctCount,
          percentage: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
        };
      })
    );
    
    // 按分数从高到低排序
    userScores.sort((a, b) => b.percentage - a.percentage);
    
    // 计算排名（支持并列）
    let currentRank = 1;
    let prevScore = -1;
    
    const rankedScores = userScores.map((score, index) => {
      // 如果分数和前一个不同，更新当前排名
      if (score.percentage !== prevScore) {
        currentRank = index + 1;
      }
      
      prevScore = score.percentage;
      
      return {
        ...score,
        rank: currentRank
      };
    });
    
    // 如果提供了userId，查找该用户的排名信息
    let userRanking = null;
    if (userId) {
      userRanking = rankedScores.find(item => item.userId === userId) || {
        userId,
        username: "未找到",
        correctCount: 0,
        percentage: 0,
        rank: rankedScores.length + 1
      };
    }
    
    return NextResponse.json({
      ranking: rankedScores,
      userRanking,
      totalParticipants: rankedScores.length
    });
    
  } catch (error: any) {
    console.error("获取排名失败:", error);
    return NextResponse.json({ error: "获取排名失败", details: error.message }, { status: 500 });
  }
} 