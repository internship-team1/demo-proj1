import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// 提交测验答案
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quizId, userId, answers } = body;
    
    if (!quizId || !userId || !answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 检查测验是否存在
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
      return NextResponse.json(
        { error: "测验不存在" },
        { status: 404 }
      );
    }

    // 检查用户是否存在
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // 检查测验是否已结束
    const now = new Date();
    if (quiz.endTime && now > quiz.endTime) {
      return NextResponse.json(
        { error: "测验已结束，无法提交答案" },
        { status: 400 }
      );
    }

    // 提交新答案
    const createdAnswers = [];
    let correctCount = 0;

    // 先获取用户已有的答案
    const existingAnswers = await prisma.answer.findMany({
      where: {
        userId,
        quizId
      }
    });

    // 创建一个映射，快速查找用户是否已回答某问题
    const answeredQuestions = new Set(existingAnswers.map(a => a.questionId));

    for (const answer of answers) {
      const { questionId, optionId } = answer;
      
      // 检查问题是否属于该测验
      const question = quiz.questions.find(q => q.id === questionId);
      if (!question) continue;
      
      // 检查选项是否属于该问题
      const option = question.options.find(o => o.id === optionId);
      if (!option) continue;
      
      // 如果用户已经回答过这个问题，跳过
      if (answeredQuestions.has(questionId)) {
        // 找到已存在的答案
        const existingAnswer = existingAnswers.find(a => a.questionId === questionId);
        if (existingAnswer) {
          createdAnswers.push(existingAnswer);
          
          // 检查已有答案是否正确
          const existingOption = question.options.find(o => o.id === existingAnswer.optionId);
          if (existingOption?.isCorrect) {
            correctCount++;
          }
        }
        continue;
      }
      
      // 创建新答案记录
      try {
        const createdAnswer = await prisma.answer.create({
          data: {
            quizId,
            questionId,
            optionId,
            userId
          }
        });
        
        createdAnswers.push(createdAnswer);
        
        // 检查是否正确
        if (option.isCorrect) {
          correctCount++;
        }
      } catch (error) {
        console.error(`创建答案失败 (问题ID: ${questionId}):`, error);
        // 如果创建失败，尝试查找可能已存在的答案
        const existingAnswer = await prisma.answer.findFirst({
          where: {
            userId,
            quizId,
            questionId
          }
        });
        
        if (existingAnswer) {
          createdAnswers.push(existingAnswer);
          
          // 检查已有答案是否正确
          const existingOption = question.options.find(o => o.id === existingAnswer.optionId);
          if (existingOption?.isCorrect) {
            correctCount++;
          }
        }
      }
    }

    // 计算分数
    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    return NextResponse.json({
      success: true,
      score: {
        correct: correctCount,
        total: totalQuestions,
        percentage
      },
      answers: createdAnswers
    });
    
  } catch (error: any) {
    console.error("提交测验答案失败:", error);
    return NextResponse.json(
      { error: "提交测验答案失败", details: error.message },
      { status: 500 }
    );
  }
} 

// 获取用户对测验的答案
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId");
    const userId = searchParams.get("userId");
    
    if (!quizId || !userId) {
      return NextResponse.json(
        { error: "缺少测验ID或用户ID" },
        { status: 400 }
      );
    }

    // 查询用户的答案
    const answers = await prisma.answer.findMany({
      where: {
        quizId: parseInt(quizId),
        userId: parseInt(userId)
      }
    });

    // 查询测验信息，包括问题和选项
    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) },
      include: {
        questions: {
          include: {
            options: true
          }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "测验不存在" },
        { status: 404 }
      );
    }

    // 计算分数
    let correctCount = 0;
    const totalQuestions = quiz.questions.length;
    
    // 将用户答案与正确答案比较
    for (const answer of answers) {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      if (!question) continue;
      
      const selectedOption = question.options.find(o => o.id === answer.optionId);
      if (selectedOption?.isCorrect) {
        correctCount++;
      }
    }
    
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // 构造用户答案映射
    const answersMap: {[questionId: number]: number} = {};
    answers.forEach(answer => {
      answersMap[answer.questionId] = answer.optionId;
    });

    return NextResponse.json({
      success: true,
      hasSubmitted: answers.length > 0,
      answers: answersMap,
      score: {
        correct: correctCount,
        total: totalQuestions,
        percentage
      }
    });
    
  } catch (error: any) {
    console.error("获取用户答案失败:", error);
    return NextResponse.json(
      { error: "获取用户答案失败", details: error.message },
      { status: 500 }
    );
  }
} 