import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// 创建新的测验
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, title, questions, timeLimit } = body;
    
    if (!courseId || !title || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 创建一个虚拟文件记录，因为数据库模型要求每个测验关联一个文件
    const file = await prisma.file.create({
      data: {
        filename: `${title}.json`,
        fileType: "quiz",
        fileUrl: "", // 虚拟URL
        courseId: courseId,
        uploaderId: 1, // 默认上传者ID，实际应用中应该使用当前用户ID
      }
    });

    // 创建测验
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + timeLimit * 60 * 1000); // 添加timeLimit分钟
    
    const quiz = await prisma.quiz.create({
      data: {
        title,
        courseId,
        fileId: file.id,
        isActive: true,
        startTime,
        endTime,
      }
    });

    // 创建问题和选项
    for (const q of questions) {
      const question = await prisma.question.create({
        data: {
          content: q.question,
          quizId: quiz.id,
        }
      });

      // 确定正确选项ID
      let correctOptionId = null;
      
      // 创建选项
      for (const [key, value] of Object.entries(q.options)) {
        const isCorrect = key === q.answer;
        
        const option = await prisma.option.create({
          data: {
            content: value as string,
            isCorrect,
            questionId: question.id,
          }
        });
        
        if (isCorrect) {
          // 更新问题，设置正确选项ID
          await prisma.question.update({
            where: { id: question.id },
            data: { correctOptionId: option.id }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "测验创建成功",
      quiz: {
        id: quiz.id,
        title: quiz.title,
        startTime: quiz.startTime,
        endTime: quiz.endTime
      }
    });
    
  } catch (error: any) {
    console.error("创建测验失败:", error);
    return NextResponse.json(
      { error: "创建测验失败", details: error.message },
      { status: 500 }
    );
  }
}

// 获取课程的测验列表
// 修改GET方法，支持两种查询方式
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const quizId = searchParams.get("quizId");

  try {
    // 按 quizId 查询单个问卷
    if (quizId) {
      const quiz = await prisma.quiz.findUnique({
        where: { id: parseInt(quizId) },
        include: {
          questions: {
            include: {
              options: true
            }
          },
          course: {
            select: {
              title: true,
              courseCode: true
            }
          }
        }
      });
      
      if (!quiz) {
        return NextResponse.json(
          { error: "问卷不存在" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(quiz);
    }

    // 按 courseId 查询课程问卷列表
    if (courseId) {
      const quizzes = await prisma.quiz.findMany({
        where: {
          courseId: parseInt(courseId)
        },
        include: {
          questions: {
            include: {
              options: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });
      
      return NextResponse.json(quizzes);
    }

    return NextResponse.json(
      { error: "缺少课程ID或问卷ID" },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error("获取问卷失败:", error);
    return NextResponse.json(
      { error: "获取问卷失败", details: error.message },
      { status: 500 }
    );
  }
}